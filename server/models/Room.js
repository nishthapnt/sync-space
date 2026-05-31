import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true }, // e.g. "8dj2ks"
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  settings: {
    isPrivate: { type: Boolean, default: false },
    password: { type: String, default: null },
  }
})

// Auto-delete expired rooms using MongoDB TTL index
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('Room', roomSchema)