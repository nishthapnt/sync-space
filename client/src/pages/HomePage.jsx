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
      const { data } = await axios.post(
        'http://localhost:3001/api/rooms',
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
    <div className="min-h-screen bg-[#050507] text-white overflow-hidden relative selection:bg-[#FFD034] selection:text-black antialiased">

      {/* NOISE */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:22px_22px] z-[100]" />

      {/* GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:42px_42px] pointer-events-none" />

      {/* AMBIENT LIGHTS */}  
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[0%] w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-[150px]" />

        <div className="absolute top-[15%] right-[-10%] w-[700px] h-[700px] bg-purple-500/10 rounded-full blur-[160px]" />

        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px]" />

        <div className="absolute bottom-[5%] right-[15%] w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[120px]" />
      </div>

      {/* FLOATING PARTICLES */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="absolute w-[2px] h-[2px] rounded-full bg-white/20 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_40px_rgba(99,102,241,0.45)] flex items-center justify-center font-black text-sm">
              S
            </div>

            <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
              SyncSpace
            </span>
          </div>

          <button
            onClick={createRoom}
            disabled={loading}
            className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 active:translate-y-1 shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
          >
            {loading ? 'Launching...' : 'Launch App'}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <header className="max-w-7xl mx-auto px-6 pt-24 md:pt-32 pb-28 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative">

        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-7 space-y-10 text-center lg:text-left"
        >

          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.12)]">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_12px_rgba(96,165,250,0.8)]"></span>
            Beyond Messaging
          </div>

          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-black tracking-[-0.06em] leading-[0.92] text-white">
              Your shared
              <br />

              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 drop-shadow-[0_0_50px_rgba(99,102,241,0.35)]">
                digital room.
              </span>
            </h1>

            <p className="text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Chat, watch videos, brainstorm, and collaborate—all in one beautiful, real-time workspace built for modern hanging out.
            </p>
          </div>

          {/* HERO ACTIONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">

            <button
              onClick={createRoom}
              disabled={loading}
              className="group w-full sm:w-auto min-w-[260px] bg-[#FFD034] text-neutral-950 rounded-full p-2 pl-7 flex justify-between items-center hover:bg-[#ffe071] hover:-translate-y-1 transition-all duration-300 active:translate-y-1 shadow-[0_20px_60px_rgba(255,208,52,0.18)] hover:shadow-[0_20px_80px_rgba(255,208,52,0.3)]"
            >
              <span className="font-black text-base tracking-wide">
                {loading ? 'Creating Room...' : 'Create Room'}
              </span>

              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center group-hover:translate-x-1 transition-all duration-300 shadow-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 12h14M12 5l7 7-7 7"
                  ></path>
                </svg>
              </div>
            </button>

            <div className="flex gap-3 w-full sm:w-auto">

              <button
                onClick={createRoom}
                className="flex-1 sm:flex-none px-7 py-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
              >
                Start Watching
              </button>

              <button
                onClick={createRoom}
                className="flex-1 sm:flex-none px-7 py-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
              >
                Open Canvas
              </button>
            </div>
          </div>
        </motion.div>

        {/* RIGHT MOCKUP */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9 }}
          className="lg:col-span-5 relative"
        >

          {/* GLOW */}
          <div className="absolute -inset-5 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 blur-[60px] rounded-full" />

          <div className="relative h-[480px] rounded-[2.7rem] bg-white/[0.04] backdrop-blur-2xl border border-white/10 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_100px_rgba(0,0,0,0.8)] hover:scale-[1.015] hover:rotate-[0.5deg] transition-all duration-500">

            {/* SHINE */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_40%)] pointer-events-none" />

            {/* TOP */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/40"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/40"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/40"></span>

                <span className="text-xs text-neutral-500 ml-2 font-mono tracking-tight">
                  workspace_v1.config
                </span>
              </div>

              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                Multiplayer active
              </span>
            </div>

            {/* CONTENT */}
            <div className="p-6 flex flex-col h-full">

              {/* MESSAGE */}
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-xl rounded-2xl max-w-[85%] self-start shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <p className="text-xs text-indigo-400 font-black mb-1">
                  Alex
                </p>

                <p className="text-sm text-neutral-200">
                  Let's sketch out the flowchart here!
                </p>
              </div>

              {/* CANVAS */}
              <div className="relative flex-1 mt-5 rounded-[2rem] border border-dashed border-white/10 bg-black/20 overflow-hidden flex items-center justify-center">

                {/* LIGHT */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_70%)]" />

                {/* FLOATING LABEL */}
                <div className="absolute top-10 left-8 px-4 py-2 rounded-2xl rounded-tl-none bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-black shadow-[0_10px_40px_rgba(99,102,241,0.45)] hover:scale-105 transition-transform">
                  🎨 Canvas active
                </div>

                {/* DUMMY UI */}
                <div className="text-center opacity-15 space-y-3">
                  <div className="w-24 h-2 bg-white rounded-full mx-auto"></div>
                  <div className="w-16 h-2 bg-white rounded-full mx-auto"></div>
                </div>

                {/* LIVE CURSOR */}
                <div className="absolute bottom-10 right-10 flex items-center gap-2">

                  <svg
                    className="w-5 h-5 text-pink-400 fill-current drop-shadow-[0_0_10px_rgba(244,114,182,0.7)]"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
                  </svg>

                  <span className="px-3 py-1 bg-pink-400 text-black font-black text-xs rounded-lg shadow-[0_10px_30px_rgba(244,114,182,0.35)]">
                    Sarah is drawing
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* FEATURES */}
      <section className="relative max-w-7xl mx-auto px-6 py-28">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">

          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Everything organized in persistent spaces
          </h2>

          <p className="text-neutral-400 text-lg">
            Why use four different applications when you can host your community inside one cohesive platform?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {[
            {
              title: 'Conversations alive',
              desc: 'Instant real-time messaging featuring typing indicators, active presence status flags, and custom rooms.',
              color: 'blue',
              icon:
                'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            },
            {
              title: 'Media Sync',
              desc: 'Host synchronization movie sessions or dive into YouTube rabbit holes with fully responsive playback state sharing.',
              color: 'purple',
              icon:
                'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
            },
            {
              title: 'Think Visually',
              desc: 'An infinite multiplayer drawing board to sketch custom ideas, make flowcharts, or post quick sticky thoughts.',
              color: 'emerald',
              icon:
                'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
            },
            {
              title: 'Mini OS Environment',
              desc: 'Every individual space bundles persistent history records, structural storage components, and layout files securely.',
              color: 'yellow',
              icon:
                'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6z'
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-[2rem] bg-white/[0.04] border border-white/10 backdrop-blur-2xl p-7 hover:-translate-y-2 hover:border-white/20 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
            >

              {/* HOVER GLOW */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_60%)]" />

              <div className={`w-14 h-14 rounded-2xl bg-${card.color}-500/10 flex items-center justify-center border border-white/10 mb-6`}>

                <svg
                  className={`w-6 h-6 text-${card.color}-400`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={card.icon}
                  />
                </svg>
              </div>

              <h3 className="text-xl font-black text-white mb-3">
                {card.title}
              </h3>

              <p className="text-neutral-400 text-sm leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* REALTIME SECTION */}
      <section className="relative max-w-7xl mx-auto px-6 py-24">

        <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-14 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">

          {/* BG LIGHT */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.08),transparent_70%)]" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-7">

            <div className="inline-block px-4 py-2 bg-black/40 border border-white/10 text-neutral-400 text-xs rounded-full font-mono tracking-[0.2em]">
              ENGINE STATUS:
              <span className="text-emerald-400 font-black ml-2">
                0ms SYNC
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black tracking-tight">
              Built for live interaction.
            </h2>

            <p className="text-neutral-400 text-lg leading-relaxed">
              See people thinking, drawing, typing, and reacting in real time. Instant syncing processes make every room interface feel alive, immersive, and truly co-present.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <footer className="max-w-6xl mx-auto px-6 pt-10 pb-24">

        <div className="relative overflow-hidden rounded-[3rem] p-14 md:p-20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 shadow-[0_40px_120px_rgba(67,56,202,0.35)]">

          {/* LIGHTS */}
          <div className="absolute -top-40 right-0 w-[450px] h-[450px] bg-cyan-400/20 rounded-full blur-[120px]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#ffffff18,transparent_45%)]" />

          <div className="relative z-10 text-center space-y-8">

            <h2 className="text-5xl md:text-6xl font-black tracking-tight">
              Create your space.
            </h2>

            <p className="text-blue-100 text-lg max-w-2xl mx-auto leading-relaxed">
              Start chatting, watching, and creating together in seconds. No complex configurations or logins needed.
            </p>

            <button
              onClick={createRoom}
              disabled={loading}
              className="px-10 py-5 bg-white text-indigo-700 rounded-2xl font-black text-lg shadow-[0_20px_60px_rgba(255,255,255,0.25)] hover:scale-105 hover:-translate-y-1 transition-all duration-300"
            >
              {loading
                ? 'Initializing environment...'
                : 'Deploy Instant Workspace'}
            </button>
          </div>
        </div>

        <p className="mt-16 text-xs text-neutral-600 tracking-[0.25em] uppercase text-center">
          SyncSpace © 2026. Built securely for immediate interaction.
        </p>
      </footer>
    </div>
  )
}