import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  sender: {
    username: String,
    color: String,
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  reactions: { type: Map, of: [String], default: {} } // { "👍": ["user1", "user2"] }
})

export default mongoose.model('Message', messageSchema)