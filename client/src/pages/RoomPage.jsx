import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import socket from '../socket'
import useRoomStore from '../store/useRoomStore'
import { generateUser } from '../utils/username'

import Chat from '../components/Chat'
import Canvas from '../components/Canvas'
import WatchTogether from '../components/WatchTogether'

export default function RoomPage() {
  const { roomId } = useParams()
  const [activeTab, setActiveTab] = useState('chat')

  const {
    setRoom,
    setMe,
    addMessage,
    setHistory,
    setUsers,
    addTyping,
    removeTyping
  } = useRoomStore()

  useEffect(() => {
    const me = generateUser()

    setRoom(roomId)
    setMe(me)
    socket.connect()

    socket.emit('room:join', { roomId, ...me })

    socket.on('room:history', setHistory)
    socket.on('message:receive', addMessage)
    socket.on('room:users', setUsers)

    socket.on('typing:start', ({ username }) => { addTyping(username) })
    socket.on('typing:stop', ({ username }) => { removeTyping(username) })

    return () => {
      socket.off('room:history')
      socket.off('message:receive')
      socket.off('room:users')
      socket.off('typing:start')
      socket.off('typing:stop')
      socket.disconnect()
    }
  }, [roomId])

  return (
    // FIXED: Removed absolute padding wrapper parameters completely to eliminate dead edges
    <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col overflow-hidden box-border">
      
      {/* COMPACT FLOATING CONTROL HEADERBAR */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex-shrink-0">
        
        {/* Simple Room Identifier */}
        <div className="min-w-0">
          <span className="text-xs font-mono text-zinc-500 block uppercase tracking-wider">Active Workspace</span>
          <h1 className="text-sm sm:text-lg font-black truncate max-w-[140px] sm:max-w-none text-zinc-200">
            #{roomId}
          </h1>
        </div>

        {/* Dense Toggle Controls */}
        <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/40">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>💬</span>
            <span className="hidden sm:inline">Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'canvas' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>🎨</span>
            <span className="hidden sm:inline">Canvas</span>
          </button>

          <button
            onClick={() => setActiveTab('watch')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'watch' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>📺</span>
            <span className="hidden sm:inline">Watch</span>
          </button>
        </div>

      </div>

      {/* FIXED: True Edge-to-Edge Bleed Framework Container */}
      <div className="flex-1 min-h-0 relative bg-zinc-950">
        
        {activeTab === 'chat' && (
          // Stripped interior margins out so message wrappers sit flush with side borders
          <div className="absolute inset-0 p-0 overflow-y-auto">
            <Chat roomId={roomId} />
          </div>
        )}

        {activeTab === 'canvas' && (
          <div className="absolute inset-0 overflow-hidden w-full h-full">
            <Canvas roomId={roomId} />
          </div>
        )}

        {activeTab === 'watch' && (
          <div className="absolute inset-0 p-0 overflow-y-auto">
            <WatchTogether roomId={roomId} />
          </div>
        )}
        
      </div>

    </div>
  )
}