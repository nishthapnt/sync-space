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
  cors: { 
    origin: [
      'http://localhost:5173',               // Local development frontend
      'https://sync-space-iota.vercel.app'    // Live production frontend on Vercel
    ], 
    methods: ['GET', 'POST'],
    credentials: true                        // Crucial for secure cookie/session handling across domains
  }
})
// Define allowed origins
const allowedOrigins = [
  'http://localhost:5173',          // Local development
  'https://sync-space-iota.vercel.app' // Your live Vercel site
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json())
app.use('/api/rooms', roomRoutes)

registerSocketHandlers(io)

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    httpServer.listen(3001, () => console.log('Server on :3001'))
  })