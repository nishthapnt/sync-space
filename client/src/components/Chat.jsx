import { useState, useRef, useEffect } from 'react'
import socket from '../socket'
import useRoomStore from '../store/useRoomStore'

export default function Chat({ roomId }) {
  const [input, setInput] = useState('')
  const typingTimer = useRef(null)
  const bottomRef = useRef(null)
  const { messages, users, typingUsers, me } = useRoomStore()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage() {
    if (!input.trim()) return
    socket.emit('message:send', { content: input })
    setInput('')
    stopTyping()
  }

  function handleInput(e) {
    setInput(e.target.value)
    startTyping()
  }

  function startTyping() {
    socket.emit('typing:start')
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(stopTyping, 2000)
  }

  function stopTyping() {
    clearTimeout(typingTimer.current)
    socket.emit('typing:stop')
  }

  const shareUrl = `${window.location.origin}/room/${roomId}`

  return (
    /* FIXED: Adjusted from h-screen to h-full so it stays bounded inside RoomPage container */
    <div className="flex h-full w-full bg-[#0d0d12] text-neutral-200 font-sans overflow-hidden">
      
      {/* Sidebar — Toggles to hidden on mobile to maximize chat window area */}
      <div className="w-64 bg-[#13131a] border-r border-neutral-800/50 flex flex-col p-4 flex-shrink-0 hidden md:flex">
        {/* Logo area */}
        <div className="flex items-center gap-3 mb-6 px-2 mt-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <span className="font-semibold text-white text-base tracking-wide">SyncSpace</span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Actions */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-2">
              Session
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-xl transition-colors text-left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Copy invite link
            </button>
          </div>

          {/* Users List */}
          <div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-2">
              Online ({users.length})
            </div>
            <div className="space-y-1">
              {users.map(u => (
                <div key={u.username} className="flex items-center gap-3 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }}></div>
                  <span className="text-sm font-medium text-neutral-300 truncate">{u.username}</span>
                  {u.username === me?.username && (
                    <span className="ml-auto text-[10px] bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Current User Card */}
        <div className="mt-auto pt-4 border-t border-neutral-800/50">
          <div className="flex items-center gap-3 px-3 py-2 bg-neutral-800/30 rounded-xl">
             <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-neutral-900 flex-shrink-0"
                style={{ backgroundColor: me?.color }}
             >
                {me?.username?.charAt(0).toUpperCase()}
             </div>
             <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-white truncate">{me?.username}</span>
                <span className="text-xs text-neutral-500">Connected</span>
             </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d12]">
        
        {/* Top Header */}
        <div className="h-14 border-b border-neutral-800/50 flex items-center px-6 justify-between flex-shrink-0">
           <span className="font-medium text-white text-sm">Room: {roomId.slice(0,8)}</span>
           <span className="px-3 py-0.5 bg-neutral-900 text-emerald-400 text-xs rounded-full border border-emerald-900/30">
             Live
           </span>
        </div>

        {/* Messages Container */}
        {/* FIXED: added min-h-0 layout rule to block text compression issues */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, i) => {
              const isMe = msg.sender.username === me?.username;
              return (
                <div key={i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-900 font-bold shrink-0 mt-0.5 text-xs"
                    style={{ backgroundColor: msg.sender.color }}
                  >
                    {msg.sender.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-xs text-neutral-200">
                        {msg.sender.username}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`px-4 py-2 text-sm leading-relaxed shadow-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-[#1c1c24] text-neutral-200 border border-neutral-800/50 rounded-2xl rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-neutral-500 italic pl-11">
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Bar Layout Container */}
        <div className="p-4 flex-shrink-0 w-full max-w-5xl mx-auto">
          <div className="relative flex items-end gap-2 bg-[#1c1c24] border border-neutral-800 rounded-2xl p-1.5 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600 transition-all">
            <textarea
              value={input}
              onChange={handleInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   sendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 max-h-24 min-h-[38px] bg-transparent resize-none py-2 px-3 text-white text-sm focus:outline-none placeholder-neutral-500"
              rows="1"
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim()}
              className="p-2.5 mb-0.5 mr-0.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors text-white flex shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}