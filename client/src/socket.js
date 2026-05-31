import { io } from 'socket.io-client'

// One shared socket instance for the whole app
// Calling io() creates the connection — we do it lazily
const socket = io('http://localhost:3001', {
  autoConnect: false // we'll connect manually when entering a room
})

export default socket