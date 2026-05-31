import { create } from 'zustand'

const useRoomStore = create((set, get) => ({
  // State
  roomId: null,
  messages: [],
  users: [],
  typingUsers: [],
  me: null, // { username, color }

  // Actions
  setRoom: (roomId) => set({ roomId }),

  setMe: (user) => set({ me: user }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setHistory: (messages) => set({ messages }),

  setUsers: (users) => set({ users }),

  addTyping: (username) =>
    set((state) => ({
      typingUsers: state.typingUsers.includes(username)
        ? state.typingUsers
        : [...state.typingUsers, username]
    })),

  removeTyping: (username) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter(u => u !== username)
    })),
}))

export default useRoomStore