import Message from "../models/Message.js";

// In-memory global presence and state stores
// (Moved outside the connection loop so they are shared across ALL sockets)
const roomUsers = {};
const canvasStates = {};
const videoStates = {};

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // ── JOIN ROOM ──────────────────────────────────────
    socket.on("room:join", async ({ roomId, username, color }) => {
      socket.join(roomId); // Socket.io "room" — a named group
      socket.data = { roomId, username, color }; // store on socket

      // Track presence
      if (!roomUsers[roomId]) roomUsers[roomId] = new Map();
      roomUsers[roomId].set(socket.id, { username, color });

      // Send message history to the joining user only
      const history = await Message.find({ roomId })
        .sort({ timestamp: 1 })
        .limit(100);
      socket.emit("room:history", history);

      // Tell everyone else this user joined
      socket.to(roomId).emit("user:joined", { username, color });

      // Send updated user list to everyone in the room
      io.to(roomId).emit("room:users", [...roomUsers[roomId].values()]);
    });

    // ── SEND MESSAGE ───────────────────────────────────
    socket.on("message:send", async ({ content }) => {
      const { roomId, username, color } = socket.data;
      if (!roomId) return;

      const msg = await Message.create({
        roomId,
        sender: { username, color },
        content,
        timestamp: new Date(),
      });

      // Broadcast to ALL users in the room (including sender)
      io.to(roomId).emit("message:receive", msg);
    });

    // ── TYPING INDICATORS ──────────────────────────────
    socket.on("typing:start", () => {
      if (!socket.data.roomId) return;
      socket
        .to(socket.data.roomId)
        .emit("typing:start", { username: socket.data.username });
    });

    socket.on("typing:stop", () => {
      if (!socket.data.roomId) return;
      socket
        .to(socket.data.roomId)
        .emit("typing:stop", { username: socket.data.username });
    });

    // ── DISCONNECT ─────────────────────────────────────
    socket.on("disconnect", () => {
      const { roomId, username } = socket.data || {};
      if (!roomId) return;

      roomUsers[roomId]?.delete(socket.id);
      socket.to(roomId).emit("user:left", { username });
      io.to(roomId).emit("room:users", [
        ...(roomUsers[roomId]?.values() ?? []),
      ]);

      // Clean up empty rooms from memory
      if (roomUsers[roomId]?.size === 0) {
        delete roomUsers[roomId];
        // Optional: clean up canvas/video states if room is dead
        delete canvasStates[roomId];
        delete videoStates[roomId];
      }
    });

    // ── CANVAS EVENTS (FIXED PAYLOAD NAMES & MEMORY) ────────────────
    
    socket.on("canvas:draw", ({ roomId, path }) => {
      if (!roomId) return;

      // Initialize room array if missing, then store the vector stroke history
      if (!canvasStates[roomId]) canvasStates[roomId] = [];
      canvasStates[roomId].push(path);

      // Broadcast the path payload to everyone EXCEPT the sender
      socket.to(roomId).emit("canvas:draw", { path });
    });

    socket.on("canvas:requestState", ({ roomId }) => {
      if (!roomId) return;
      // Send the chronological drawing strokes array to the catching up user
      if (canvasStates[roomId]) {
        socket.emit("canvas:state", { history: canvasStates[roomId] });
      }
    });

    socket.on("canvas:clear", ({ roomId }) => {
      if (!roomId) return;
      canvasStates[roomId] = [];
      io.to(roomId).emit("canvas:clear");
    });

    socket.on("cursor:move", ({ roomId, x, y, username, color }) => {
      if (!roomId) return;
      // Broadcast cursor position to others (ephemeral)
      socket.to(roomId).emit("cursor:move", { x, y, username, color });
    });

    // ── VIDEO EVENTS ────────────────────────────────────────────

    socket.on("video:setUrl", ({ roomId, url }) => {
      if (!roomId) return;
      if (!videoStates[roomId]) videoStates[roomId] = {};
      videoStates[roomId].url = url;
      videoStates[roomId].playing = false;
      videoStates[roomId].timestamp = 0;
      io.to(roomId).emit("video:setUrl", { url });
    });

    socket.on("video:play", ({ roomId, timestamp }) => {
      if (!roomId) return;
      if (videoStates[roomId]) {
        videoStates[roomId].playing = true;
        videoStates[roomId].timestamp = timestamp;
      }
      socket.to(roomId).emit("video:play", { timestamp });
    });

    socket.on("video:pause", ({ roomId, timestamp }) => {
      if (!roomId) return;
      if (videoStates[roomId]) {
        videoStates[roomId].playing = false;
        videoStates[roomId].timestamp = timestamp;
      }
      socket.to(roomId).emit("video:pause", { timestamp });
    });

    socket.on("video:seek", ({ roomId, timestamp }) => {
      if (!roomId) return;
      if (videoStates[roomId]) videoStates[roomId].timestamp = timestamp;
      socket.to(roomId).emit("video:seek", { timestamp });
    });

    socket.on("video:sync", ({ roomId, timestamp, playing }) => {
      if (!roomId) return;
      socket.to(roomId).emit("video:sync", { timestamp, playing });
    });

    socket.on("video:requestState", ({ roomId }) => {
      if (!roomId) return;
      if (videoStates[roomId]) {
        socket.emit("video:state", videoStates[roomId]);
      }
    });
  });
}