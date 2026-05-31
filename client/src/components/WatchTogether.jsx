import { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import socket from '../socket'
import useRoomStore from '../store/useRoomStore'

const DRIFT_THRESHOLD = 1.5   // seconds

export default function WatchTogether({ roomId }) {
  const playerRef         = useRef(null)
  const playerContainerRef = useRef(null)
  const ignoreEvents      = useRef(false)
  const lastProgressRef   = useRef(0)

  const [url,       setUrl]       = useState('')
  const [inputUrl,  setInputUrl]  = useState('')
  const [playing,   setPlaying]   = useState(false)
  const [muted,     setMuted]     = useState(true) 
  const [queue,     setQueue]     = useState([])
  
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [roomPlaying, setRoomPlaying] = useState(false) 

  const { me, users } = useRoomStore()

  const amController = users.length > 0 &&
    [...users].sort((a, b) => a.username.localeCompare(b.username))[0]?.username === me?.username

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function getCurrentTime() {
    if (!isPlayerReady || !playerRef.current) return 0
    try {
      const internal = playerRef.current?.getInternalPlayer?.()
      if (internal?.getCurrentTime) return internal.getCurrentTime()
      if (playerRef.current?.getCurrentTime) return playerRef.current.getCurrentTime()
      return 0
    } catch {
      return 0
    }
  }

  useEffect(() => {
    socket.emit('video:requestState', { roomId })

    function onState({ url: u, playing: p, timestamp: t }) {
      if (u) { 
        setUrl(u)
        setRoomPlaying(p)
      }
      if (t && isPlayerReady && playerRef.current?.seekTo) {
        setTimeout(() => playerRef.current.seekTo(t, 'seconds'), 300)
      }
    }

    function onSetUrl({ url: u }) {
      setIsPlayerReady(false) 
      setPlaying(false)
      setRoomPlaying(false)
      setUrl(u)
      setMuted(true) 
    }

    function onPlay({ timestamp }) {
      setRoomPlaying(true)
      if (amController || !isPlayerReady || !playerRef.current?.seekTo) return
      ignoreEvents.current = true
      playerRef.current.seekTo(timestamp, 'seconds')
      setPlaying(true)
      setTimeout(() => { ignoreEvents.current = false }, 500)
    }

    function onPause({ timestamp }) {
      setRoomPlaying(false)
      if (amController || !isPlayerReady || !playerRef.current?.seekTo) return
      ignoreEvents.current = true
      playerRef.current.seekTo(timestamp, 'seconds')
      setPlaying(false)
      setTimeout(() => { ignoreEvents.current = false }, 500)
    }

    function onSeek({ timestamp }) {
      if (amController || !isPlayerReady || !playerRef.current?.seekTo) return
      playerRef.current.seekTo(timestamp, 'seconds')
    }

    function onSync({ timestamp, playing: p }) {
      setRoomPlaying(p)
      if (amController || !isPlayerReady || !playerRef.current?.seekTo) return
      const current = getCurrentTime()
      if (Math.abs(current - timestamp) > DRIFT_THRESHOLD) {
        playerRef.current.seekTo(timestamp, 'seconds')
      }
      setPlaying(p)
    }

    socket.on('video:state',  onState)
    socket.on('video:setUrl', onSetUrl)
    socket.on('video:play',   onPlay)
    socket.on('video:pause',  onPause)
    socket.on('video:seek',   onSeek)
    socket.on('video:sync',   onSync)

    let syncInterval
    if (amController && isPlayerReady) {
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
  }, [amController, playing, roomId, isPlayerReady])

  function handlePlayerReady() {
    setIsPlayerReady(true)
    // If the room is already playing, setting playing=true here helps catch up
    if (roomPlaying) {
      setPlaying(true)
    }
  }

  function handlePlay() {
    if (!isPlayerReady) return
    if (amController && !ignoreEvents.current) {
      const t = getCurrentTime()
      setRoomPlaying(true)
      socket.emit('video:play', { roomId, timestamp: t })
    }
  }

  function handlePause() {
    if (!isPlayerReady) return
    if (amController && !ignoreEvents.current) {
      const t = getCurrentTime()
      setRoomPlaying(false)
      socket.emit('video:pause', { roomId, timestamp: t })
    }
  }

  function handleProgress({ playedSeconds }) {
    if (!isPlayerReady) return
    const jump = Math.abs(playedSeconds - lastProgressRef.current)
    if (jump > 2 && amController && !ignoreEvents.current) {
      socket.emit('video:seek', { roomId, timestamp: playedSeconds })
    }
    lastProgressRef.current = playedSeconds
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
    if (!inputUrl.trim() || !amController) return
    const trimmed = inputUrl.trim()
    setQueue(prev => [...prev, trimmed])
    if (!url) {
      setIsPlayerReady(false)
      setRoomPlaying(false)
      setPlaying(false)
      setUrl(trimmed)
      socket.emit('video:setUrl', { roomId, url: trimmed })
    }
    setInputUrl('')
  }

  function playFromQueue(queueUrl) {
    if (!amController) return
    setIsPlayerReady(false)
    setRoomPlaying(false)
    setPlaying(false)
    setUrl(queueUrl)
    socket.emit('video:setUrl', { roomId, url: queueUrl })
  }

  // FIX: Unmute Gesture Handler
  // Changes muted first to fulfill browser user interaction rules, then updates play state
  function handleUnmuteInteraction() {
    setMuted(false)
    setPlaying(true)
    setRoomPlaying(true)
    
    // Force native iframe hook kickstart if it got stuck
    setTimeout(() => {
      if (playerRef.current?.seekTo && !amController) {
        socket.emit('video:requestState', { roomId })
      }
    }, 200)
  }

  const S = {
    root: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', width: '100%', height: '100%', background: '#09090b' },
    playerWrapper: { flex: isMobile ? 'none' : '1', height: isMobile ? '56.25vw' : '100%', width: isMobile ? '100%' : 'auto', minHeight: isMobile ? 'auto' : '100%', position: 'relative', background: '#000' },
    sidebar: { flex: 1, width: isMobile ? '100%' : '280px', flexShrink: 0, borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)', borderTop: isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', flexDirection: 'column', background: '#121215', minHeight: 0, overflow: 'hidden' },
    empty: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#71717a' },
    badge: { position: 'absolute', top: '8px', left: '8px', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, zIndex: 10 },
    fsBtn: { position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0, 0, 0, 0.75)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '5px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)' },
    unmuteOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, backdropFilter: 'blur(4px)' },
    unmuteBtn: { background: '#FFD034', color: '#09090b', padding: '12px 24px', borderRadius: '8px', fontWeight: 900, fontSize: '13px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }
  }

  return (
    <div style={S.root}>
      <div ref={playerContainerRef} style={S.playerWrapper}>
        {url ? (
          <ReactPlayer
            key={url} 
            ref={playerRef}
            url={url}
            playing={playing}
            muted={muted} 
            onReady={handlePlayerReady}
            onPlay={handlePlay}
            onPause={handlePause}
            onProgress={handleProgress}
            progressInterval={500}
            width="100%"
            height="100%"
            controls={true} // Enable default controls so users have a backup native play button
            style={{ position: 'absolute', top: 0, left: 0 }}
            config={{
              youtube: {
                playerVars: {
                  autoplay: 1,
                  playsinline: 1,
                  rel: 0
                },
              },
            }}
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

        {/* Autoplay Cover Overlay */}
        {url && muted && (
          <div style={S.unmuteOverlay}>
            <button onClick={handleUnmuteInteraction} style={S.unmuteBtn}>
              ▶ Click to Start & Sync Media
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Control Panel */}
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
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {queue.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#71717a', textAlign: 'center', marginTop: '12px' }}>
              No tracks upcoming
            </p>
          ) : (
            queue.map((qUrl, i) => {
              const isActive = qUrl === url
              return (
                <div
                  key={i}
                  onClick={() => amController && playFromQueue(qUrl)}
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
                    {qUrl}
                  </span>
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