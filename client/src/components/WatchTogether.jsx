import { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import socket from '../socket'

const DRIFT_THRESHOLD = 1.5   // seconds
const SYNC_INTERVAL   = 5000  // ms
const NUDGE_THRESHOLD = 0.25  // seconds; smaller drift is ignored, larger is corrected via playbackRate
const NUDGE_RATE      = 0.05  // speed up / slow down by 5% to catch up
const SUPPRESS_MS     = 600   // ignore native events caused by our own programmatic changes

export default function WatchTogether({ roomId }) {
  // react-player v3: the ref IS the underlying HTMLVideoElement
  const playerRef          = useRef(null)
  const playerContainerRef = useRef(null)
  const readyRef           = useRef(false)
  const pendingRef         = useRef(null)   // state received before the player was ready
  const suppressUntilRef   = useRef(0)

  const [url,       setUrl]       = useState('')
  const [inputUrl,  setInputUrl]  = useState('')
  const [muted,     setMuted]     = useState(true)
  const [queue,     setQueue]     = useState([])   // [{ id, url }] owned by the server
  const [currentId, setCurrentId] = useState(null)
  const [status,    setStatus]    = useState('idle') // idle | loading | ready | error
  const [urlError,  setUrlError]  = useState('')

  // The server decides who the host is (see video:host); we just compare socket ids
  const [hostId, setHostId] = useState(null)
  const amController = !!hostId && hostId === socket.id

  // Latest values for the long-lived socket listeners (avoids stale closures / re-subscribing)
  const isHostRef = useRef(amController)
  const urlRef    = useRef(url)
  useEffect(() => {
    isHostRef.current = amController
    urlRef.current    = url
  }, [amController, url])

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function suppress() {
    suppressUntilRef.current = Date.now() + SUPPRESS_MS
  }

  function isSuppressed() {
    return Date.now() < suppressUntilRef.current
  }

  function getCurrentTime() {
    const el = playerRef.current
    return el && readyRef.current ? el.currentTime || 0 : 0
  }

  function isPlayingNow() {
    const el = playerRef.current
    return !!el && !el.paused && !el.ended
  }

  // Apply a room state to the local player. Queues it if the player isn't ready yet.
  function applyState({ playing, timestamp }) {
    const el = playerRef.current
    if (!el || !readyRef.current) {
      pendingRef.current = { playing, timestamp }
      return
    }
    suppress()
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
      const diff = timestamp - el.currentTime   // > 0: we're behind the host
      if (Math.abs(diff) > DRIFT_THRESHOLD) {
        el.currentTime = timestamp
        el.playbackRate = 1
      } else if (playing && Math.abs(diff) > NUDGE_THRESHOLD) {
        // Small drift: gently speed up / slow down instead of a visible jump
        el.playbackRate = diff > 0 ? 1 + NUDGE_RATE : 1 - NUDGE_RATE
      } else {
        el.playbackRate = 1
      }
    }
    if (playing && el.paused) {
      el.play().catch(err => { if (err.name !== 'AbortError') console.warn('play() failed', err) })
    } else if (!playing && !el.paused) {
      el.pause()
      el.playbackRate = 1
    }
  }

  // Register socket listeners ONCE per room; they read live values through refs.
  useEffect(() => {
    function onState({ url: u, itemId, playing, timestamp }) {
      if (!u) return
      setCurrentId(itemId ?? null)
      if (u !== urlRef.current) {
        readyRef.current = false
        setStatus('loading')
        setUrl(u)
      }
      applyState({ playing, timestamp })
    }

    function onSetUrl({ url: u, itemId, autoplay }) {
      setCurrentId(itemId ?? null)
      if (u === urlRef.current && readyRef.current && playerRef.current) {
        // Same source again (e.g. a repeated queue item): the player won't reload, so restart it
        suppress()
        playerRef.current.currentTime = 0
        applyState({ playing: !!autoplay, timestamp: 0 })
        return
      }
      readyRef.current = false
      pendingRef.current = autoplay ? { playing: true, timestamp: 0 } : null
      setStatus('loading')
      setUrl(u)
    }

    function onQueue({ queue: q }) {
      setQueue(Array.isArray(q) ? q : [])
    }

    function onPlay({ timestamp }) {
      if (isHostRef.current) return
      applyState({ playing: true, timestamp })
    }

    function onPause({ timestamp }) {
      if (isHostRef.current) return
      applyState({ playing: false, timestamp })
    }

    function onSeek({ timestamp }) {
      if (isHostRef.current) return
      applyState({ playing: isPlayingNow(), timestamp })
    }

    function onSync({ timestamp, playing }) {
      if (isHostRef.current) return
      applyState({ playing, timestamp })
    }

    function onHost({ hostId: id }) {
      setHostId(id ?? null)
    }

    socket.on('video:host',   onHost)
    socket.on('queue:update', onQueue)
    socket.on('video:state',  onState)
    socket.on('video:setUrl', onSetUrl)
    socket.on('video:play',   onPlay)
    socket.on('video:pause',  onPause)
    socket.on('video:seek',   onSeek)
    socket.on('video:sync',   onSync)

    socket.emit('video:requestState', { roomId })

    // Host heartbeat so viewers can correct drift and the server keeps a fresh timestamp
    const syncInterval = setInterval(() => {
      if (!isHostRef.current || !readyRef.current || !urlRef.current) return
      socket.emit('video:sync', { roomId, timestamp: getCurrentTime(), playing: isPlayingNow() })
    }, SYNC_INTERVAL)

    return () => {
      socket.off('video:host',   onHost)
      socket.off('queue:update', onQueue)
      socket.off('video:state',  onState)
      socket.off('video:setUrl', onSetUrl)
      socket.off('video:play',   onPlay)
      socket.off('video:pause',  onPause)
      socket.off('video:seek',   onSeek)
      socket.off('video:sync',   onSync)
      clearInterval(syncInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  function handlePlayerReady() {
    readyRef.current = true
    setStatus('ready')
    if (pendingRef.current) {
      const pending = pendingRef.current
      pendingRef.current = null
      applyState(pending)
    }
  }

  // Native media events: only the host broadcasts, and never for our own programmatic changes
  function handlePlay() {
    if (!readyRef.current || !isHostRef.current || isSuppressed()) return
    socket.emit('video:play', { roomId, timestamp: getCurrentTime() })
  }

  function handlePause() {
    if (!readyRef.current || !isHostRef.current || isSuppressed()) return
    const el = playerRef.current
    if (el?.ended) return
    socket.emit('video:pause', { roomId, timestamp: getCurrentTime() })
  }

  function handleSeeked() {
    if (!readyRef.current || !isHostRef.current || isSuppressed()) return
    socket.emit('video:seek', { roomId, timestamp: getCurrentTime() })
  }

  function handleError() {
    console.warn('Video failed to load:', urlRef.current)
    setStatus('error')
  }

  // The host tells the server the video ended; the server picks and broadcasts the next one
  function handleEnded() {
    if (!isHostRef.current) return
    socket.emit('queue:next', { roomId })
  }

  function toggleFullscreen() {
    const container = playerContainerRef.current
    if (!container) return
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.error(err))
    } else {
      document.exitFullscreen()
    }
  }

  function submitUrl() {
    const trimmed = inputUrl.trim()
    if (!trimmed || !amController) return
    try {
      const { protocol } = new URL(trimmed)
      if (protocol !== 'http:' && protocol !== 'https:') throw new Error('protocol')
    } catch {
      setUrlError('Enter a valid http(s) link')
      return
    }
    setUrlError('')
    socket.emit('queue:add', { roomId, url: trimmed })
    setInputUrl('')
  }

  function playFromQueue(id) {
    if (!amController) return
    socket.emit('queue:play', { roomId, id })
  }

  function removeFromQueue(id) {
    if (!amController) return
    socket.emit('queue:remove', { roomId, id })
  }

  // Browsers block unmuted autoplay: one click unmutes and joins the room's current playback
  function handleUnmuteInteraction() {
    setMuted(false)
    if (!amController) socket.emit('video:requestState', { roomId })
  }

  const S = {
    root: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', width: '100%', height: '100%', background: '#09090b' },
    playerWrapper: { flex: isMobile ? 'none' : '1', height: isMobile ? '56.25vw' : '100%', width: isMobile ? '100%' : 'auto', minHeight: isMobile ? 'auto' : '100%', position: 'relative', background: '#000' },
    sidebar: { flex: 1, width: isMobile ? '100%' : '280px', flexShrink: 0, borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)', borderTop: isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', flexDirection: 'column', background: '#121215', minHeight: 0, overflow: 'hidden' },
    empty: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#71717a' },
    badge: { position: 'absolute', top: '8px', left: '8px', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, zIndex: 10 },
    fsBtn: { position: 'absolute', top: '8px', right: '8px', background: 'rgba(0, 0, 0, 0.75)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '5px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)' },
    unmuteOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, backdropFilter: 'blur(4px)' },
    unmuteBtn: { background: '#FFD034', color: '#09090b', padding: '12px 24px', borderRadius: '8px', fontWeight: 900, fontSize: '13px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }
  }

  return (
    <div style={S.root}>
      <div ref={playerContainerRef} style={S.playerWrapper}>
        {url ? (
          <ReactPlayer
            ref={playerRef}
            src={url}
            muted={muted}
            playsInline
            controls
            onReady={handlePlayerReady}
            onPlay={handlePlay}
            onPause={handlePause}
            onLoadedMetadata={handlePlayerReady}
            onSeeked={handleSeeked}
            onEnded={handleEnded}
            onError={handleError}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            config={{ youtube: { rel: 0 } }}
          />
        ) : (
          <div style={S.empty}>
            <div style={{ fontSize: '1.5rem' }}>▶</div>
            <p style={{ color: '#f4f4f5', fontSize: '13px', fontWeight: 700 }}>No media running</p>
            <p style={{ fontSize: '11px', opacity: 0.6 }}>
              {amController ? 'Paste a link below' : 'Waiting for host...'}
            </p>
          </div>
        )}

        <div style={{
          ...S.badge,
          background: amController ? 'rgba(255, 208, 52, 0.15)' : 'rgba(59, 130, 246, 0.15)',
          color: amController ? '#FFD034' : '#60a5fa',
          border: amController ? '1px solid rgba(255, 208, 52, 0.25)' : '1px solid rgba(59, 130, 246, 0.25)',
        }}>
          {amController ? '⚡ HOST' : '👁 VIEWER'}
        </div>

        {url && (
          <button onClick={toggleFullscreen} style={S.fsBtn}>
            ⛶ Fullscreen
          </button>
        )}

        {url && status === 'loading' && (
          <div style={{ ...S.empty, pointerEvents: 'none', zIndex: 5 }}>
            <p style={{ fontSize: '11px' }}>Loading…</p>
          </div>
        )}

        {url && status === 'error' && (
          <div style={{ ...S.empty, background: 'rgba(0,0,0,0.85)', zIndex: 15 }}>
            <p style={{ color: '#f4f4f5', fontSize: '13px', fontWeight: 700 }}>Couldn't load this video</p>
            <p style={{ fontSize: '11px', opacity: 0.6 }}>
              {amController ? 'Pick another one from the queue' : 'Waiting for the host to pick another'}
            </p>
          </div>
        )}

        {url && muted && (
          <div style={S.unmuteOverlay}>
            <button onClick={handleUnmuteInteraction} style={S.unmuteBtn}>
              ▶ Click to Start & Sync Media
            </button>
          </div>
        )}
      </div>

      <div style={S.sidebar}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <p style={{ fontSize: '10px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
            {amController ? 'Add video to list' : 'Playback Queue'}
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitUrl()}
              placeholder={amController ? "Paste YouTube link..." : "Host controlling selection"}
              disabled={!amController}
              style={{
                flex: 1, background: '#18181b', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#f4f4f5',
                outline: 'none', opacity: amController ? 1 : 0.4,
              }}
            />
            {amController && (
              <button
                onClick={submitUrl}
                disabled={!inputUrl.trim()}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none',
                  background: inputUrl.trim() ? '#FFD034' : 'rgba(255, 208, 52, 0.15)',
                  color: '#09090b', fontSize: '11px', fontWeight: 800, cursor: 'pointer'
                }}
              >
                Add
              </button>
            )}
          </div>
          {urlError && <p style={{ fontSize: '10px', color: '#f87171', marginTop: '6px' }}>{urlError}</p>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {queue.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#71717a', textAlign: 'center', marginTop: '12px' }}>
              Queue is empty
            </p>
          ) : (
            queue.map((item, i) => {
              const isActive = item.id === currentId
              return (
                <div
                  key={item.id}
                  onClick={() => amController && playFromQueue(item.id)}
                  style={{
                    padding: '6px 8px', borderRadius: '6px', marginBottom: '4px',
                    background: isActive ? 'rgba(255, 208, 52, 0.06)' : '#18181b',
                    border: `1px solid ${isActive ? 'rgba(255, 208, 52, 0.2)' : 'transparent'}`,
                    cursor: amController ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '10px', color: isActive ? '#FFD034' : '#71717a', flexShrink: 0 }}>
                    {isActive ? '▶' : `${i + 1}`}
                  </span>
                  <span style={{
                    fontSize: '11px', color: isActive ? '#f4f4f5' : '#a1a1aa',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
                  }}>
                    {item.url}
                  </span>
                  {amController && (
                    <button
                      onClick={e => { e.stopPropagation(); removeFromQueue(item.id) }}
                      aria-label="Remove from queue"
                      style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '6px', background: '#0e0e11', flexShrink: 0 }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '10px', color: '#71717a' }}>
            {amController ? 'Host privileges active' : 'Tracking host playback sequence'}
          </span>
        </div>
      </div>
    </div>
  )
}