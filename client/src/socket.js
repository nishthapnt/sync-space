import { io } from 'socket.io-client'

// Use the production Render URL if available, otherwise fallback to localhost for development
const SOCKET_URL = import.meta.env.VITE_WS_SERVER_URL || 'http://localhost:3001'

// One shared socket instance for the whole app
const socket = io(SOCKET_URL, {
  autoConnect: false // we'll connect manually when entering a room
})

export default socket