import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import socket from '../socket'
import useRoomStore from '../store/useRoomStore'

const COLORS = ['#f5c842', '#f06292', '#5ecfa0', '#5ba4f5', '#b57cf6', '#f5845a', '#f0ede8']
const BRUSH_SIZES = [2, 5, 10, 20]

function throttle(fn, ms) {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn(...args)
    }
  }
}

export default function Canvas({ roomId }) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)

  const { me } = useRoomStore()

  const [tool, setTool] = useState('draw')
  const [color, setColor] = useState('#f5c842')
  const [brushSize, setBrushSize] = useState(5)
  const [cursors, setCursors] = useState({})

  const stateRef = useRef({ roomId, me })
  useEffect(() => {
    stateRef.current = { roomId, me }
  }, [roomId, me])

  // ─────────────────────────────
  // Brush Sync
  // ─────────────────────────────
  const syncBrush = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
    }

    if (tool === 'draw') {
      canvas.isDrawingMode = true
      canvas.freeDrawingBrush.color = color
      canvas.freeDrawingBrush.width = brushSize
    } else if (tool === 'erase') {
      canvas.isDrawingMode = true
      canvas.freeDrawingBrush.color = '#1c1c1f'
      canvas.freeDrawingBrush.width = brushSize * 3
    } else {
      canvas.isDrawingMode = false
    }
  }, [tool, color, brushSize])

  // ─────────────────────────────
  // Initialize Fabric Canvas
  // ─────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: '#1c1c1f',
      isDrawingMode: true,
      selection: true,
      allowTouchScrolling: false // Prevents screen dragging/scrolling while drawing
    })

    fabricRef.current = canvas

    // Fix system pointer-events handling over canvas objects
    canvas.upperCanvasEl.style.pointerEvents = 'auto'
    canvas.upperCanvasEl.style.touchAction = 'none'

    function resizeCanvas() {
      const wrapper = wrapperRef.current
      if (!wrapper) return

      canvas.setDimensions({
        width: wrapper.clientWidth,
        height: wrapper.clientHeight
      })
      
      canvas.calcOffset()
      canvas.renderAll()
    }

    resizeCanvas()
    
    // Monitors real-time container layout shifts
    const resizeObserver = new ResizeObserver(() => resizeCanvas())
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current)
    
    window.addEventListener('resize', resizeCanvas)
    syncBrush()

    // Emit Path Serialization to Server
    canvas.on('path:created', (e) => {
      const currentRoomId = stateRef.current.roomId
      if (!currentRoomId) return

      socket.emit('canvas:draw', {
        roomId: currentRoomId,
        path: e.path.toObject()
      })
    })

    // Broadcast Position Coordinates
    const broadcastCursor = throttle(({ e }) => {
      const eventSource = e.touches ? e.touches[0] : e
      if (!eventSource) return

      const pointer = canvas.getPointer(eventSource)
      const { roomId: currentRoomId, me: currentUser } = stateRef.current
      if (!currentRoomId) return

      socket.emit('cursor:move', {
        roomId: currentRoomId,
        x: pointer.x,
        y: pointer.y,
        username: currentUser?.username,
        color: currentUser?.color || '#f5c842'
      })
    }, 30)

    canvas.on('mouse:move', broadcastCursor)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      resizeObserver.disconnect()
      canvas.off('path:created')
      canvas.off('mouse:move')
      canvas.dispose()
    }
  }, [])

  useEffect(() => {
    syncBrush()
  }, [syncBrush])

  // ─────────────────────────────
  // Socket Synchronization Handlers
  // ─────────────────────────────
  useEffect(() => {
    function handleRemoteDraw({ path }) {
      const canvas = fabricRef.current
      if (!canvas || !path) return

      fabric.util.enlivenObjects([path], (objects) => {
        if (!objects) return
        objects.forEach((obj) => {
          obj.set({ selectable: false, evented: false })
          canvas.add(obj)
        })
        canvas.requestRenderAll()
      })
    }

    function handleRemoteClear() {
      const canvas = fabricRef.current
      if (!canvas) return
      canvas.clear()
      canvas.setBackgroundColor('#1c1c1f', () => canvas.requestRenderAll())
    }

    function handleRemoteCursor({ username, x, y, color }) {
      if (!username || username === stateRef.current.me?.username) return
      setCursors((prev) => ({
        ...prev,
        [username]: { x, y, color }
      }))
    }

    socket.on('canvas:draw', handleRemoteDraw)
    socket.on('canvas:clear', handleRemoteClear)
    socket.on('cursor:move', handleRemoteCursor)

    return () => {
      socket.off('canvas:draw', handleRemoteDraw)
      socket.off('canvas:clear', handleRemoteClear)
      socket.off('cursor:move', handleRemoteCursor)
    }
  }, [])

  // ─────────────────────────────
  // Interactive UI Commands
  // ─────────────────────────────
  function clearCanvas() {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.clear()
    canvas.setBackgroundColor('#1c1c1f', () => canvas.requestRenderAll())
    socket.emit('canvas:clear', { roomId })
  }

  function downloadCanvas() {
    const canvas = fabricRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1 })
    const link = document.createElement('a')
    link.download = `syncspace-${roomId}.png`
    link.href = dataUrl
    link.click()
  }

  function toolBtn(t, icon) {
    const active = tool === t
    return (
      <button
        onClick={() => setTool(t)}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: active ? 'rgba(245,200,66,0.18)' : 'transparent',
          outline: active ? '1px solid rgba(245,200,66,0.45)' : 'none'
        }}
      >
        {icon}
      </button>
    )
  }

  return (
    /* RESTORED CONTAINER BOUNDS: Explicit height setting ensures layout matches original constraints */
    <div style={{ position: 'relative', width: '100%', height: '80vh', background: '#1c1c1f', overflow: 'hidden' }}>
      
      {/* Toolbar layout container */}
      <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '14px', background: 'rgba(14,14,15,0.92)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', zIndex: 20, maxWidth: '90%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {toolBtn('draw', '✏️')}
        {toolBtn('erase', '⬜')}
        {toolBtn('select', '↖')}

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c)
              setTool('draw')
            }}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: 'none',
              background: c,
              cursor: 'pointer',
              flexShrink: 0,
              outline: color === c ? `2px solid ${c}` : '2px solid transparent',
              outlineOffset: '2px'
            }}
          />
        ))}

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {BRUSH_SIZES.map((size) => (
          <button
            key={size}
            onClick={() => setBrushSize(size)}
            style={{
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              flexShrink: 0,
              background: brushSize === size ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', margin: 'auto', background: color }} />
          </button>
        ))}

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        <button onClick={clearCanvas} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(245,132,90,0.3)', background: 'rgba(245,132,90,0.1)', color: '#f5845a', cursor: 'pointer', flexShrink: 0 }}>
          Clear
        </button>

        <button onClick={downloadCanvas} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(240,237,232,0.7)', cursor: 'pointer', flexShrink: 0 }}>
          Export
        </button>
      </div>

      {/* Render Realtime User Cursors */}
      {Object.entries(cursors).map(([username, cursor]) => (
        <div
          key={username}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
            pointerEvents: 'none',
            zIndex: 15,
            willChange: 'transform'
          }}
        >
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cursor.color || '#fff', border: '2px solid white' }} />
          <div style={{ marginTop: '4px', background: cursor.color || '#fff', color: '#000', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
            {username}
          </div>
        </div>
      ))}

      {/* Mounting Node Wrapper */}
      <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}