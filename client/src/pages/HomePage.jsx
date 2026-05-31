import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function createRoom() {
    setLoading(true)

    try {
      // FIXED: Swapped hardcoded localhost for your production Environment Variable
      const API_URL = import.meta.env.VITE_WS_SERVER_URL || 'http://localhost:3001'
      const { data } = await axios.post(
        `${API_URL}/api/rooms`,
        {
          expiresIn: '24h'
        }
      )

      navigate(`/room/${data.roomId}`)
    } catch (error) {
      console.error('Failed to create room', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white overflow-x-hidden relative selection:bg-[#FFD034] selection:text-black antialiased w-full">

      {/* NOISE */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:22px_22px] z-[100]" />

      {/* GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:42px_42px] pointer-events-none" />

      {/* AMBIENT LIGHTS */}  
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[0%] w-[300px] sm:w-[700px] h-[300px] sm:h-[700px] bg-blue-500/10 rounded-full blur-[100px] sm:blur-[150px]" />
        <div className="absolute top-[15%] right-[-10%] w-[300px] sm:w-[700px] h-[300px] sm:h-[700px] bg-purple-500/10 rounded-full blur-[100px] sm:blur-[160px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-cyan-500/10 rounded-full blur-[100px] sm:blur-[160px]" />
        <div className="absolute bottom-[5%] right-[15%] w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-pink-500/10 rounded-full blur-[90px] sm:blur-[120px]" />
      </div>

      {/* FLOATING PARTICLES — Reduced count on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-[2px] h-[2px] rounded-full bg-white/20 animate-pulse hidden sm:block"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-black/20 border-b border-white/10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_40px_rgba(99,102,241,0.45)] flex items-center justify-center font-black text-sm">
              S
            </div>
            <span className="font-black text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
              SyncSpace
            </span>
          </div>

          
        </div>
      </nav>

      {/* HERO */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 md:pt-24 lg:pt-32 pb-16 lg:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 space-y-6 sm:space-y-10 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.12)]">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_12px_rgba(96,165,250,0.8)]"></span>
            Beyond Messaging
          </div>

          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[6.5rem] font-black tracking-[-0.05em] leading-[1.0] lg:leading-[0.92] text-white">
              Your shared
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 drop-shadow-[0_0_50px_rgba(99,102,241,0.35)]">
                digital room.
              </span>
            </h1>
            <p className="text-neutral-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0">
              Chat, watch videos, brainstorm, and collaborate—all in one beautiful, real-time workspace built for modern hanging out.
            </p>
          </div>

          {/* HERO ACTIONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2 max-w-xl mx-auto lg:max-w-none">
            <button
              onClick={createRoom}
              disabled={loading}
              className="group w-full sm:w-auto min-w-[240px] bg-[#FFD034] text-neutral-950 rounded-full p-1.5 pl-6 flex justify-between items-center hover:bg-[#ffe071] hover:-translate-y-1 transition-all duration-300 active:translate-y-1 shadow-[0_20px_60px_rgba(255,208,52,0.18)]"
            >
              <span className="font-black text-sm sm:text-base tracking-wide">
                {loading ? 'Creating Room...' : 'Create Room'}
              </span>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-full flex items-center justify-center group-hover:translate-x-1 transition-all duration-300 shadow-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={createRoom}
                className="flex-1 sm:flex-none px-5 sm:px-7 py-3.5 sm:py-4 text-xs sm:text-sm font-medium rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
              >
                Start Watching
              </button>
              <button
                onClick={createRoom}
                className="flex-1 sm:flex-none px-5 sm:px-7 py-3.5 sm:py-4 text-xs sm:text-sm font-medium rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
              >
                Open Canvas
              </button>
            </div>
          </div>
        </motion.div>

        {/* RIGHT MOCKUP — Optimized for flexible layout scaling */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="lg:col-span-5 relative w-full max-w-lg mx-auto lg:max-w-none mt-6 lg:mt-0"
        >
          <div className="absolute -inset-5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-[40px] rounded-full" />

          <div className="relative h-[360px] sm:h-[440px] lg:h-[480px] rounded-[2rem] sm:rounded-[2.7rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_40%)] pointer-events-none" />

            {/* TOP BAR */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/40"></span>
                <span className="text-[10px] text-neutral-500 ml-2 font-mono truncate max-w-[100px] sm:max-w-none">
                  workspace_v1.config
                </span>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] text-emerald-400 font-bold uppercase tracking-wider whitespace-nowrap">
                Multiplayer active
              </span>
            </div>

            {/* BAR CONTENT */}
            <div className="p-4 sm:p-6 flex flex-col h-[calc(100%-60px)]">
              {/* CHAT BUBBLE */}
              <div className="p-3 sm:p-4 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-xl rounded-xl sm:rounded-2xl max-w-[85%] self-start">
                <p className="text-[10px] text-indigo-400 font-black mb-0.5">Alex</p>
                <p className="text-xs sm:text-sm text-neutral-200">Let's sketch out the flowchart here!</p>
              </div>

              {/* MOCK CANVAS CONTAINER */}
              <div className="relative flex-1 mt-4 rounded-xl sm:rounded-[2rem] border border-dashed border-white/10 bg-black/20 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_70%)]" />
                
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 px-3 py-1.5 rounded-xl rounded-tl-none bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-black">
                  🎨 Canvas active
                </div>

                <div className="text-center opacity-10 space-y-2">
                  <div className="w-16 sm:w-24 h-1.5 bg-white rounded-full mx-auto"></div>
                  <div className="w-10 sm:w-16 h-1.5 bg-white rounded-full mx-auto"></div>
                </div>

                {/* LIVE CURSOR */}
                <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 fill-current" viewBox="0 0 24 24">
                    <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
                  </svg>
                  <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-pink-400 text-black font-black text-[10px] sm:text-xs rounded-md shadow-lg">
                    Sarah
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* FEATURES */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="text-center max-w-3xl mx-auto mb-14 sm:text-center space-y-4">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white px-2">
            Everything organized in persistent spaces
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base md:text-lg max-w-xl mx-auto">
            Why use four different applications when you can host your community inside one cohesive platform?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              title: 'Conversations alive',
              desc: 'Instant real-time messaging featuring typing indicators, active presence status flags, and custom rooms.',
              color: 'blue',
              icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            },
            {
              title: 'Media Sync',
              desc: 'Host synchronization movie sessions or dive into YouTube rabbit holes with fully responsive playback state sharing.',
              color: 'purple',
              icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
            },
            {
              title: 'Think Visually',
              desc: 'An infinite multiplayer drawing board to sketch custom ideas, make flowcharts, or post quick sticky thoughts.',
              color: 'emerald',
              icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
            },
            {
              title: 'Mini OS Environment',
              desc: 'Every individual space bundles persistent history records, structural storage components, and layout files securely.',
              color: 'yellow',
              icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6z'
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl p-6 sm:p-7 hover:-translate-y-1.5 hover:border-white/20 transition-all duration-300 shadow-xl"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_60%)]" />
              
              {/* TAILWIND COLOR RESOLUTION FALLBACK STRINGS */}
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/10 mb-5 ${
                card.color === 'blue' ? 'bg-blue-500/10' :
                card.color === 'purple' ? 'bg-purple-500/10' :
                card.color === 'emerald' ? 'bg-emerald-500/10' : 'bg-yellow-500/10'
              }`}>
                <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${
                  card.color === 'blue' ? 'text-blue-400' :
                  card.color === 'purple' ? 'text-purple-400' :
                  card.color === 'emerald' ? 'text-emerald-400' : 'text-yellow-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} />
                </svg>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white mb-2.5">{card.title}</h3>
              <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* REALTIME INFRASTRUCTURE STATUS */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[3rem] border border-white/10 bg-white/[0.02] backdrop-blur-2xl p-8 sm:p-14 text-center shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.05),transparent_70%)]" />
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-4 sm:space-y-6">
            <div className="inline-block px-3.5 py-1.5 bg-black/40 border border-white/10 text-[10px] text-neutral-400 rounded-full font-mono tracking-widest">
              ENGINE STATUS: <span className="text-emerald-400 font-black ml-1">0ms SYNC</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight">Built for live interaction.</h2>
            <p className="text-neutral-400 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              See people thinking, drawing, typing, and reacting in real time. Instant syncing processes make every room interface feel alive, immersive, and truly co-present.
            </p>
          </div>
        </div>
      </section>

      {/* CTA CLOSING CONTAINER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[3rem] p-8 sm:p-16 md:p-20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 shadow-3xl text-center">
          <div className="absolute -top-40 right-0 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-cyan-400/10 rounded-full blur-[80px] sm:blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#ffffff10,transparent_45%)]" />

          <div className="relative z-10 space-y-6 sm:space-y-8">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight">Create your space.</h2>
            <p className="text-blue-100 text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              Start chatting, watching, and creating together in seconds. No complex configurations or logins needed.
            </p>
            <button
              onClick={createRoom}
              disabled={loading}
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-indigo-700 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg shadow-xl hover:scale-[1.02] sm:hover:scale-105 transition-all duration-300"
            >
              {loading ? 'Initializing environment...' : 'Deploy Instant Workspace'}
            </button>
          </div>
        </div>

        <p className="mt-12 text-[10px] text-neutral-600 tracking-widest uppercase text-center">
          SyncSpace © 2026. Built securely for immediate interaction.
        </p>
      </footer>
    </div>
  )
}