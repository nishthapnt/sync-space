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
    <div className="h-screen w-screen bg-zinc-950 text-white p-4 flex flex-col overflow-hidden box-border">
      
      {/* Top Header & Navigation Bar Container */}
      {/* FIXED: Keeps header on the left, buttons in a horizontal row on the right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 flex-shrink-0">
        
        {/* Left Side: Header Text */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Room: {roomId}
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm">
            Realtime collaboration room
          </p>
        </div>

        {/* Right Side: Horizontal Toggle Buttons */}
        <div className="flex gap-2 self-start sm:self-center">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition whitespace-nowrap ${
              activeTab === 'chat' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            💬 Chat
          </button>

          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition whitespace-nowrap ${
              activeTab === 'canvas' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            🎨 Canvas
          </button>

          <button
            onClick={() => setActiveTab('watch')}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition whitespace-nowrap ${
              activeTab === 'watch' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            📺 Watch
          </button>
        </div>

      </div>

      {/* Main Workspace Layout Wrapper — Completely maximizing full layout footprint */}
      <div className="flex-1 min-h-0 relative bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="absolute inset-0 p-4 overflow-y-auto">
            <Chat roomId={roomId} />
          </div>
        )}

        {activeTab === 'canvas' && (
          <div className="absolute inset-0 overflow-hidden">
            <Canvas roomId={roomId} />
          </div>
        )}

        {activeTab === 'watch' && (
          <div className="absolute inset-0 p-4 overflow-y-auto">
            <WatchTogether roomId={roomId} />
          </div>
        )}
      </div>

    </div>
  )
}