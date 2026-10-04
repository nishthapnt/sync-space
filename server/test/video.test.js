import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { io as connect } from 'socket.io-client'
import Message from '../models/Message.js'
import { registerSocketHandlers } from '../socket/handlers.js'

// Message history needs MongoDB; these tests only exercise in-memory room logic.
Message.find = () => ({ sort: () => ({ limit: async () => [] }) })

const URL_A = 'https://example.com/a.mp4'
const URL_B = 'https://example.com/b.mp4'
const URL_C = 'https://example.com/c.mp4'

let httpServer, io, port
const clients = []

before(async () => {
  httpServer = createServer()
  io = new Server(httpServer)
  registerSocketHandlers(io)
  await new Promise((resolve) => httpServer.listen(0, resolve))
  port = httpServer.address().port
})

after(async () => {
  clients.forEach((c) => c.disconnect())
  await io.close()
})

beforeEach(() => {
  clients.splice(0).forEach((c) => c.disconnect())
})

let roomCounter = 0
const newRoom = () => `room-${++roomCounter}`

// Connects a client that records every event it receives, so tests can wait for
// events that already arrived as well as ones still to come.
async function join(roomId, username) {
  const socket = connect(`http://localhost:${port}`, { forceNew: true })
  socket.log = []
  socket.onAny((event, data) => socket.log.push({ event, data }))
  clients.push(socket)
  await new Promise((resolve) => socket.on('connect', resolve))
  socket.emit('room:join', { roomId, username, color: '#fff' })
  await waitFor(socket, 'video:host')
  return socket
}

function find(socket, event, predicate = () => true, from = 0) {
  return socket.log.slice(from).find((e) => e.event === event && predicate(e.data))
}

async function waitFor(socket, event, predicate = () => true, from = 0, ms = 1000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    const hit = find(socket, event, predicate, from)
    if (hit) return hit.data
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error(`timed out waiting for "${event}"`)
}

// Asserts nothing matching arrives within a short window after `from`
async function expectNo(socket, event, from, ms = 150) {
  await new Promise((r) => setTimeout(r, ms))
  assert.equal(find(socket, event, () => true, from), undefined, `unexpected "${event}"`)
}

// Marks "now" in a client's log so later waits only look at newer events
const mark = (socket) => socket.log.length

test('first user to join becomes host and later joiners see the same host', async () => {
  const room = newRoom()
  const host = await join(room, 'alice')
  const viewer = await join(room, 'bob')

  const { hostId } = await waitFor(host, 'video:host')
  assert.equal(hostId, host.id)
  assert.equal((await waitFor(viewer, 'video:host')).hostId, host.id)
})

test('host leaving hands host to the longest-present user', async () => {
  const room = newRoom()
  const host = await join(room, 'alice')
  const second = await join(room, 'bob')
  const third = await join(room, 'carol')

  const at = mark(third)
  host.disconnect()

  assert.equal((await waitFor(second, 'video:host', (d) => d.hostId === second.id)).hostId, second.id)
  assert.equal((await waitFor(third, 'video:host', (d) => d.hostId === second.id, at)).hostId, second.id)
})

test('only the host can add to the queue; the first item starts loading', async () => {
  const room = newRoom()
  const host = await join(room, 'alice')
  const viewer = await join(room, 'bob')

  const at = mark(host)
  viewer.emit('queue:add', { url: URL_A })
  await expectNo(host, 'queue:update', at)

  host.emit('queue:add', { url: URL_A })
  const { queue } = await waitFor(viewer, 'queue:update', (d) => d.queue.length === 1)
  assert.equal(queue[0].url, URL_A)

  const setUrl = await waitFor(viewer, 'video:setUrl')
  assert.equal(setUrl.url, URL_A)
  assert.equal(setUrl.itemId, queue[0].id)
  assert.equal(setUrl.autoplay, false)
})

test('invalid URLs are rejected', async () => {
  const room = newRoom()
  const host = await join(room, 'alice')

  const at = mark(host)
  for (const url of ['not a url', 'javascript:alert(1)', 'ftp://example.com/x', 42, null, 'https://x.com/' + 'a'.repeat(2100)]) {
    host.emit('queue:add', { url })
  }
  host.emit('queue:add') // no payload at all
  await expectNo(host, 'queue:update', at)
})

test('queue:next advances through the queue, autoplays, and stops at the end', async () => {
  const room = newRoom()
  const host = await join(room, 'alice')
  const viewer = await join(room, 'bob')

  host.emit('queue:add', { url: URL_A })
  host.emit('queue:add', { url: URL_B })
  const { queue } = await waitFor(viewer, 'queue:update', (d) => d.queue.length === 2)

  // A viewer cannot advance the queue
  let at = mark(host)
  viewer.emit('queue:next')
  await expectNo(host, 'video:setUrl', at)

  at = mark(viewer)
  host.emit('queue:next')
  const next = await waitFor(viewer, 'video:setUrl', () => true, at)
  assert.deepEqual([next.url, next.itemId, next.autoplay], [URL_B, queue[1].id, true])

  // Already on the last item: nothing more to play
  at = mark(viewer)
  host.emit('queue:next')
  await expectNo(viewer, 'video:setUrl', at)
})

test('queue:play jumps to an item and queue:remove drops it', async () => {
  const room = newRoom()
  const host = await join(room, 'alice')
  const viewer = await join(room, 'bob')

  for (const url of [URL_A, URL_B, URL_C]) host.emit('queue:add', { url })
  const { queue } = await waitFor(viewer, 'queue:update', (d) => d.queue.length === 3)

  let at = mark(viewer)
  host.emit('queue:play', { id: queue[2].id })
  assert.equal((await waitFor(viewer, 'video:setUrl', () => true, at)).url, URL_C)

  at = mark(viewer)
  host.emit('queue:remove', { id: queue[1].id })
  const updated = await waitFor(viewer, 'queue:update', () => true, at)
  assert.deepEqual(updated.queue.map((q) => q.url), [URL_A, URL_C])

  // Unknown ids are ignored
  at = mark(viewer)
  host.emit('queue:play', { id: 'nope' })
  await expectNo(viewer, 'video:setUrl', at)
})

test('only the host can change playback, and bad timestamps are ignored', async () => {
  const room = newRoom()
  const host = await join(room, 'alice')
  const viewer = await join(room, 'bob')
  host.emit('queue:add', { url: URL_A })
  await waitFor(viewer, 'video:setUrl')

  let at = mark(host)
  viewer.emit('video:play', { timestamp: 10 })
  viewer.emit('video:seek', { timestamp: 20 })
  await expectNo(host, 'video:play', at)
  await expectNo(host, 'video:seek', at, 0)

  at = mark(viewer)
  for (const timestamp of [-1, NaN, Infinity, '5', undefined]) host.emit('video:play', { timestamp })
  await expectNo(viewer, 'video:play', at)

  host.emit('video:play', { timestamp: 12 })
  assert.equal((await waitFor(viewer, 'video:play', () => true, at)).timestamp, 12)
})

test('a late joiner receives host, queue and the current state with elapsed time added', async () => {
  const room = newRoom()
  const host = await join(room, 'alice')
  host.emit('queue:add', { url: URL_A })
  await waitFor(host, 'video:setUrl')
  host.emit('video:play', { timestamp: 30 })
  await new Promise((r) => setTimeout(r, 1100))

  const late = await join(room, 'bob')
  const state = await waitFor(late, 'video:state')
  assert.equal(state.url, URL_A)
  assert.equal(state.playing, true)
  assert.ok(state.timestamp >= 31 && state.timestamp < 33, `timestamp was ${state.timestamp}`)
  assert.equal((await waitFor(late, 'queue:update')).queue.length, 1)
  assert.equal((await waitFor(late, 'video:host')).hostId, host.id)
})
