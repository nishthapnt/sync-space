import { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import socket from '../socket'
import useRoomStore from '../store/useRoomStore'

const DRIFT_THRESHOLD = 1.5   // seconds — seek to correct if drift exceeds this

export default function WatchTogether({ roomId }) {
  const playerRef      = useRef(null)
  const ignoreEvents   = useRef(false)
  const lastProgressRef = useRef(0)

  const [url,       setUrl]       = useState('')
  const [inputUrl,  setInputUrl]  = useState('')
  const [playing,   setPlaying]   = useState(false)
  const [queue,     setQueue]     = useState([])

  const { me, users } = useRoomStore()

  // First user alphabetically is the controller (host)
  const amController = users.length > 0 &&
    [...users].sort((a, b) => a.username.localeCompare(b.username))[0]?.username === me?.username

  // ── Safe helper: get current playback time ────────────────
  // ReactPlayer wraps the internal player — getCurrentTime lives on the
  // internal player (YouTube iframe API), not on the ReactPlayer ref itself.
  function getCurrentTime() {
    try {
      const internal = playerRef.current?.getInternalPlayer?.()
      if (internal?.getCurrentTime) return internal.getCurrentTime()
      // Fallback for HTML5 video
      if (playerRef.current?.getCurrentTime) return playerRef.current.getCurrentTime()
      return 0
    } catch {
      return 0
    }
  }

  // ── Socket listeners ──────────────────────────────────────
  useEffect(() => {
    socket.emit('video:requestState', { roomId })

    function onState({ url: u, playing: p, timestamp: t }) {
      if (u) { setUrl(u); setPlaying(p) }
      if (t) setTimeout(() => playerRef.current?.seekTo(t, 'seconds'), 600)
    }
    function onSetUrl({ url: u }) {
      setUrl(u)
      setPlaying(false)
    }
    function onPlay({ timestamp }) {
      if (amController) return
      ignoreEvents.current = true
      playerRef.current?.seekTo(timestamp, 'seconds')
      setPlaying(true)
      setTimeout(() => { ignoreEvents.current = false }, 500)
    }
    function onPause({ timestamp }) {
      if (amController) return
      ignoreEvents.current = true
      playerRef.current?.seekTo(timestamp, 'seconds')
      setPlaying(false)
      setTimeout(() => { ignoreEvents.current = false }, 500)
    }
    function onSeek({ timestamp }) {
      if (amController) return
      playerRef.current?.seekTo(timestamp, 'seconds')
    }
    function onSync({ timestamp, playing: p }) {
      if (amController) return
      const current = getCurrentTime()
      if (Math.abs(current - timestamp) > DRIFT_THRESHOLD) {
        playerRef.current?.seekTo(timestamp, 'seconds')
      }
      setPlaying(p)
    }

    socket.on('video:state',  onState)
    socket.on('video:setUrl', onSetUrl)
    socket.on('video:play',   onPlay)
    socket.on('video:pause',  onPause)
    socket.on('video:seek',   onSeek)
    socket.on('video:sync',   onSync)

    // Controller broadcasts its timestamp every 5s for drift correction
    let syncInterval
    if (amController) {
      syncInterval = setInterval(() => {
        const t = getCurrentTime()
        socket.emit('video:sync', { roomId, timestamp: t, playing })
      }, 5000)
    }

    return () => {
      socket.off('video:state',  onState)
      socket.off('video:setUrl', onSetUrl)
      socket.off('video:play',   onPlay)
      socket.off('video:pause',  onPause)
      socket.off('video:seek',   onSeek)
      socket.off('video:sync',   onSync)
      clearInterval(syncInterval)
    }
  }, [amController, playing, roomId])

  // ── Player event handlers (controller only) ───────────────
  function handlePlay() {
    if (!amController || ignoreEvents.current) return
    const t = getCurrentTime()
    socket.emit('video:play', { roomId, timestamp: t })
  }

  function handlePause() {
    if (!amController || ignoreEvents.current) return
    const t = getCurrentTime()
    socket.emit('video:pause', { roomId, timestamp: t })
  }

  // onSeek is unreliable on YouTube — detect seeks via progress jumps instead
  function handleProgress({ playedSeconds }) {
    const jump = Math.abs(playedSeconds - lastProgressRef.current)
    // A jump > 2s that wasn't caused by normal playback = seek
    if (jump > 2 && amController && !ignoreEvents.current) {
      socket.emit('video:seek', { roomId, timestamp: playedSeconds })
    }
    lastProgressRef.current = playedSeconds
  }

  // ── Queue actions ─────────────────────────────────────────
  function submitUrl() {
    if (!inputUrl.trim() || !amController) return
    const trimmed = inputUrl.trim()
    setQueue(prev => [...prev, trimmed])
    if (!url) {
      setUrl(trimmed)
      socket.emit('video:setUrl', { roomId, url: trimmed })
    }
    setInputUrl('')
  }

  function playFromQueue(queueUrl) {
    if (!amController) return
    setUrl(queueUrl)
    setPlaying(false)
    socket.emit('video:setUrl', { roomId, url: queueUrl })
  }

  // ── Styles ────────────────────────────────────────────────
  const S = {
    root:    { display: 'flex', height: '100%', background: 'var(--color-base)' },
    player:  { flex: 1, position: 'relative', background: '#000', minWidth: 0 },
    sidebar: {
      width: '280px', flexShrink: 0,
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--color-surface)',
    },
    empty: {
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '12px', color: 'var(--color-muted)',
    },
    badge: {
      position: 'absolute', top: '12px', left: '12px',
      padding: '3px 10px', borderRadius: '99px',
      fontSize: '11px', fontWeight: 600,
    },
  }

  return (
    <div style={S.root}>

      {/* ── Player ── */}
      <div style={S.player}>
        {url ? (
          <ReactPlayer
            ref={playerRef}
            url={url}
            playing={playing}
            onPlay={handlePlay}
            onPause={handlePause}
            onProgress={handleProgress}
            progressInterval={500}
            width="100%"
            height="100%"
            controls={amController}
            style={{ position: 'absolute', top: 0, left: 0 }}
            config={{
              youtube: {
                playerVars: {
                  disablekb: amController ? 0 : 1,
                  rel: 0,
                },
              },
            }}
          />
        ) : (
          <div style={S.empty}>
            <div style={{ fontSize: '3rem' }}>▶</div>
            <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              No video loaded
            </p>
            <p style={{ fontSize: '13px', textAlign: 'center', maxWidth: '220px' }}>
              {amController
                ? 'Paste a YouTube URL in the sidebar to start'
                : 'Waiting for the host to add a video…'}
            </p>
          </div>
        )}

        {/* Role badge */}
        {amController ? (
          <div style={{
            ...S.badge,
            background: 'rgba(245,200,66,0.15)',
            color: '#f5c842',
            border: '1px solid rgba(245,200,66,0.25)',
          }}>
            ⚡ Host
          </div>
        ) : (
          <div style={{
            ...S.badge,
            background: 'rgba(91,164,245,0.15)',
            color: '#5ba4f5',
            border: '1px solid rgba(91,164,245,0.25)',
          }}>
            👁 Viewer
          </div>
        )}
      </div>

      {/* ── Sidebar ── */}
      <div style={S.sidebar}>

        {/* URL input */}
        <div style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{
            fontSize: '11px', color: 'var(--color-muted)', marginBottom: '8px',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {amController ? 'Add to queue' : 'Queue — host controls'}
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitUrl()}
              placeholder="YouTube URL…"
              disabled={!amController}
              style={{
                flex: 1, background: 'var(--color-elevated)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', padding: '7px 10px',
                fontSize: '12px', color: 'var(--color-primary)',
                outline: 'none', opacity: amController ? 1 : 0.5,
              }}
            />
            <button
              onClick={submitUrl}
              disabled={!amController || !inputUrl.trim()}
              style={{
                padding: '7px 12px', borderRadius: '8px', border: 'none',
                background: amController && inputUrl.trim() ? '#f5c842' : 'rgba(245,200,66,0.2)',
                color: '#1a1400', fontSize: '12px', fontWeight: 600,
                cursor: amController ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Queue list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          <p style={{
            fontSize: '11px', color: 'var(--color-muted)', marginBottom: '8px',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '0 2px',
          }}>
            Up next
          </p>
          {queue.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', textAlign: 'center', marginTop: '24px' }}>
              Queue is empty
            </p>
          ) : (
            queue.map((qUrl, i) => {
              const isActive = qUrl === url
              return (
                <div
                  key={i}
                  onClick={() => amController && playFromQueue(qUrl)}
                  style={{
                    padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
                    background:  isActive ? 'rgba(245,200,66,0.1)' : 'var(--color-elevated)',
                    border: `1px solid ${isActive ? 'rgba(245,200,66,0.22)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: amController ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: '11px', color: isActive ? '#f5c842' : 'var(--color-muted)', flexShrink: 0 }}>
                    {isActive ? '▶' : `${i + 1}.`}
                  </span>
                  <span style={{
                    fontSize: '11px', color: 'var(--color-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {qUrl}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Sync status footer */}
        <div style={{
          padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#5ecfa0', flexShrink: 0,
            animation: 'var(--animate-pulse-dot)',
          }} />
          <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
            {amController ? 'You are the host' : `Synced to host · drift correction every 5s`}
          </span>
        </div>
      </div>
    </div>
  )
}