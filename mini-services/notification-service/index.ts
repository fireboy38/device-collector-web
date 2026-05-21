import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // Use default socket.io path (/socket.io/) to avoid conflict with REST endpoints
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface NotificationPayload {
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}

// Track connected clients
let connectedClients = 0

io.on('connection', (socket) => {
  connectedClients++
  console.log(`[WS] Client connected: ${socket.id} (total: ${connectedClients})`)

  // Handle subscribe event - client joins a room based on role
  socket.on('subscribe', (data: { role?: string; userId?: number }) => {
    if (data.role) {
      socket.join(`role:${data.role}`)
      console.log(`[WS] Client ${socket.id} subscribed to role:${data.role}`)
    }
    // All connected clients also join a general room
    socket.join('all')
  })

  socket.on('disconnect', (reason) => {
    connectedClients--
    console.log(`[WS] Client disconnected: ${socket.id} reason: ${reason} (total: ${connectedClients})`)
  })

  socket.on('error', (error) => {
    console.error(`[WS] Socket error (${socket.id}):`, error)
  })
})

// REST endpoint for Next.js API routes to broadcast notifications
// Only handle /notify path, let socket.io handle everything else
function handleRequest(req: IncomingMessage, res: ServerResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/notify') {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const payload: NotificationPayload = JSON.parse(body)
        console.log(`[WS] Broadcasting notification: ${payload.type} - ${payload.title}`)

        // Broadcast to all connected clients
        io.emit('notification', {
          ...payload,
          timestamp: new Date().toISOString(),
        })

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({ success: true, clients: connectedClients }))
      } catch (e) {
        console.error('[WS] Invalid notification payload:', e)
        if (!res.headersSent) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }))
        }
      }
    })
  } else if (req.url === '/notify' || req.url?.startsWith('/notify')) {
    // Non-POST requests to /notify
    if (!res.headersSent) {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
    }
  }
  // Don't handle other paths - let socket.io handle them
}

httpServer.on('request', handleRequest)

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[WS] Notification service running on port ${PORT}`)
  console.log(`[WS] Socket.io path: /socket.io/ (default)`)
  console.log(`[WS] REST endpoint: POST http://localhost:${PORT}/notify`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WS] Received SIGTERM signal, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('[WS] Notification service closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[WS] Received SIGINT signal, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('[WS] Notification service closed')
    process.exit(0)
  })
})
