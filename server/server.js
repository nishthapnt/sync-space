import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import roomRoutes from './routes/rooms.js'
import { registerSocketHandlers } from './socket/handlers.js'

dotenv.config()

const app = express()
const httpServer = createServer(app) // ← KEY CONCEPT below

const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
})

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use('/api/rooms', roomRoutes)

registerSocketHandlers(io)

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    httpServer.listen(3001, () => console.log('Server on :3001'))
  })