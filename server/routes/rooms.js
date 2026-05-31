import { Router } from 'express'
import { nanoid } from 'nanoid'
import Room from '../models/Room.js'
import Message from '../models/Message.js'

const router = Router()

// POST /api/rooms — create a new room
router.post('/', async (req, res) => {
  const { expiresIn } = req.body // '1h', '24h', or null

  const roomId = nanoid(6) // → "8dj2ks"

  const expiresAt = expiresIn
    ? new Date(Date.now() + parseDuration(expiresIn))
    : null

  const room = await Room.create({ roomId, expiresAt })
  res.json({ roomId: room.roomId })
})

// GET /api/rooms/:roomId — check if a room exists
router.get('/:roomId', async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.roomId })
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json(room)
})

// GET /api/rooms/:roomId/messages — fetch message history
router.get('/:roomId/messages', async (req, res) => {
  const messages = await Message.find({ roomId: req.params.roomId })
    .sort({ timestamp: 1 })
    .limit(100)
  res.json(messages)
})

function parseDuration(str) {
  if (str === '1h')  return 60 * 60 * 1000
  if (str === '24h') return 24 * 60 * 60 * 1000
  return 0
}

export default router