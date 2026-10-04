import { randomUUID } from "crypto";
import Message from "../models/Message.js";

// In-memory global presence and state stores
// (Shared across ALL socket connections)
const roomUsers = {};
const canvasStates = {};
const videoStates = {};
const roomHosts = {}; // roomId -> socket.id of the user who controls playback
const videoQueues = {}; // roomId -> [{ id, url }]

const MAX_URL_LENGTH = 2048;
const MAX_QUEUE_LENGTH = 50;

function isValidTime(t) {
  return typeof t === "number" && Number.isFinite(t) && t >= 0;
}

function isValidUrl(u) {
  if (typeof u !== "string" || u.length > MAX_URL_LENGTH) return false;
  try {
    const { protocol } = new URL(u);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

// Current state with the real time elapsed since the host last reported it added in
function currentVideoState(roomId) {
  const base = videoStates[roomId];
  if (!base) return null;
  const state = { ...base };
  if (state.playing) state.timestamp += (Date.now() - state.lastUpdated) / 1000;
  return state;
}

// Makes a queue item the current video for everyone in the room
function loadItem(io, roomId, item, autoplay) {
  videoStates[roomId] = {
    url: item.url,
    itemId: item.id,
    playing: autoplay,
    timestamp: 0,
    lastUpdated: Date.now(),
  };
  io.to(roomId).emit("video:setUrl", { url: item.url, itemId: item.id, autoplay });
}

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

      // First user in the room (or any user, if the host is gone) becomes the host
      if (!roomHosts[roomId] || !roomUsers[roomId].has(roomHosts[roomId])) {
        roomHosts[roomId] = socket.id;
        io.to(roomId).emit("video:host", { hostId: socket.id });
      } else {
        socket.emit("video:host", { hostId: roomHosts[roomId] });
      }

      // Bring the joiner up to date with what's playing
      const videoState = currentVideoState(roomId);
      if (videoState) socket.emit("video:state", videoState);
      socket.emit("queue:update", { queue: videoQueues[roomId] ?? [] });
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

      // Hand host over to the longest-present user if the host left
      if (roomHosts[roomId] === socket.id) {
        const nextHost = roomUsers[roomId]?.keys().next().value;
        if (nextHost) {
          roomHosts[roomId] = nextHost;
          io.to(roomId).emit("video:host", { hostId: nextHost });
        } else {
          delete roomHosts[roomId];
        }
      }
      socket.to(roomId).emit("user:left", { username });
      io.to(roomId).emit("room:users", [
        ...(roomUsers[roomId]?.values() ?? []),
      ]);

      // Clean up empty rooms from memory
      if (roomUsers[roomId]?.size === 0) {
        delete roomUsers[roomId];
        delete canvasStates[roomId];
        delete videoStates[roomId];
        delete roomHosts[roomId];
        delete videoQueues[roomId];
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

    // ── VIDEO EVENTS ───────────────────────────────────
    // The server is the source of truth: the room comes from socket.data (never the
    // payload) and only the room's host may change playback.
    function hostRoom() {
      const roomId = socket.data?.roomId;
      return roomId && roomHosts[roomId] === socket.id ? roomId : null;
    }

    // ── QUEUE ──────────────────────────────────────────
    socket.on("queue:add", ({ url } = {}) => {
      const roomId = hostRoom();
      if (!roomId || !isValidUrl(url)) return;

      const queue = (videoQueues[roomId] ??= []);
      if (queue.length >= MAX_QUEUE_LENGTH) return;

      const item = { id: randomUUID(), url };
      queue.push(item);
      io.to(roomId).emit("queue:update", { queue });

      // Nothing playing yet: start this one straight away
      if (!videoStates[roomId]) loadItem(io, roomId, item, false);
    });

    socket.on("queue:remove", ({ id } = {}) => {
      const roomId = hostRoom();
      if (!roomId || !videoQueues[roomId]) return;

      videoQueues[roomId] = videoQueues[roomId].filter((item) => item.id !== id);
      io.to(roomId).emit("queue:update", { queue: videoQueues[roomId] });
    });

    socket.on("queue:play", ({ id } = {}) => {
      const roomId = hostRoom();
      const item = roomId && videoQueues[roomId]?.find((q) => q.id === id);
      if (!item) return;
      loadItem(io, roomId, item, true);
    });

    // Sent by the host when the current video ends
    socket.on("queue:next", () => {
      const roomId = hostRoom();
      const queue = roomId && videoQueues[roomId];
      if (!queue) return;

      const index = queue.findIndex((item) => item.id === videoStates[roomId]?.itemId);
      const next = queue[index + 1];
      if (next) loadItem(io, roomId, next, true);
    });

    socket.on("video:play", ({ timestamp } = {}) => {
      const roomId = hostRoom();
      if (!roomId || !videoStates[roomId] || !isValidTime(timestamp)) return;

      Object.assign(videoStates[roomId], {
        playing: true,
        timestamp,
        lastUpdated: Date.now(),
      });

      socket.to(roomId).emit("video:play", { timestamp });
    });

    socket.on("video:pause", ({ timestamp } = {}) => {
      const roomId = hostRoom();
      if (!roomId || !videoStates[roomId] || !isValidTime(timestamp)) return;

      Object.assign(videoStates[roomId], {
        playing: false,
        timestamp,
        lastUpdated: Date.now(),
      });

      socket.to(roomId).emit("video:pause", { timestamp });
    });

    socket.on("video:seek", ({ timestamp } = {}) => {
      const roomId = hostRoom();
      if (!roomId || !videoStates[roomId] || !isValidTime(timestamp)) return;

      Object.assign(videoStates[roomId], { timestamp, lastUpdated: Date.now() });

      socket.to(roomId).emit("video:seek", { timestamp });
    });

    // Host heartbeat: refreshes the server's copy and lets viewers correct drift
    socket.on("video:sync", ({ timestamp, playing } = {}) => {
      const roomId = hostRoom();
      if (!roomId || !videoStates[roomId] || !isValidTime(timestamp)) return;

      Object.assign(videoStates[roomId], {
        timestamp,
        playing: !!playing,
        lastUpdated: Date.now(),
      });

      socket.to(roomId).emit("video:sync", { timestamp, playing: !!playing });
    });

    socket.on("video:requestState", () => {
      const roomId = socket.data?.roomId;
      if (!roomId) return;

      socket.emit("video:host", { hostId: roomHosts[roomId] });
      socket.emit("queue:update", { queue: videoQueues[roomId] ?? [] });
      const state = currentVideoState(roomId);
      if (state) socket.emit("video:state", state);
    });
  });
}