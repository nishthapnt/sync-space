import Message from "../models/Message.js";

// In-memory global presence and state stores
// (Shared across ALL socket connections)
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
        delete canvasStates[roomId];
        delete videoStates[roomId];
      }
    });

    // ── CANVAS EVENTS ──────────────────────────────────
    socket.on("canvas:draw", ({ roomId, path }) => {
      if (!roomId) return;

      if (!canvasStates[roomId]) canvasStates[roomId] = [];
      canvasStates[roomId].push(path);

      // Broadcast path vector to everyone EXCEPT the sender
      socket.to(roomId).emit("canvas:draw", { path });
    });

    socket.on("canvas:requestState", ({ roomId }) => {
      if (!roomId) return;
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
      socket.to(roomId).emit("cursor:move", { x, y, username, color });
    });

    // ── VIDEO EVENTS (UPDATED SYSTEM OF TRUTH) ───────────
    socket.on("video:setUrl", ({ roomId, url }) => {
      if (!roomId) return;
      
      videoStates[roomId] = {
        url,
        playing: false,
        timestamp: 0,
        lastUpdated: Date.now() // Track precisely WHEN this state was logged
      };
      
      io.to(roomId).emit("video:setUrl", { url });
    });

    socket.on("video:play", ({ roomId, timestamp }) => {
      if (!roomId) return;
      
      videoStates[roomId] = {
        url: videoStates[roomId]?.url || "",
        playing: true,
        timestamp: timestamp,
        lastUpdated: Date.now()
      };
      
      socket.to(roomId).emit("video:play", { timestamp });
    });

    socket.on("video:pause", ({ roomId, timestamp }) => {
      if (!roomId) return;
      
      videoStates[roomId] = {
        url: videoStates[roomId]?.url || "",
        playing: false,
        timestamp: timestamp,
        lastUpdated: Date.now()
      };
      
      socket.to(roomId).emit("video:pause", { timestamp });
    });

    socket.on("video:seek", ({ roomId, timestamp }) => {
      if (!roomId) return;
      if (videoStates[roomId]) {
        videoStates[roomId].timestamp = timestamp;
        videoStates[roomId].lastUpdated = Date.now();
      }
      socket.to(roomId).emit("video:seek", { timestamp });
    });

    socket.on("video:sync", ({ roomId, timestamp, playing }) => {
      if (!roomId) return;
      // Host heartbeat logs updates directly to the server cache
      if (videoStates[roomId]) {
        videoStates[roomId].timestamp = timestamp;
        videoStates[roomId].playing = playing;
        videoStates[roomId].lastUpdated = Date.now();
      }
      socket.to(roomId).emit("video:sync", { timestamp, playing });
    });

    socket.on("video:requestState", ({ roomId }) => {
      if (!roomId || !videoStates[roomId]) return;

      // Create a shallow copy of the state data structure
      const state = { ...videoStates[roomId] };

      // DYNAMIC ELAPSED TIME CALCULATION: 
      // If the video is playing, add the real-world time elapsed since the server last heard from the host.
      if (state.playing && state.lastUpdated) {
        const elapsedRealTimeSeconds = (Date.now() - state.lastUpdated) / 1000;
        state.timestamp += elapsedRealTimeSeconds;
      }

      socket.emit("video:state", state);
    });
  });
}