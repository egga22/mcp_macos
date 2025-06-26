import express from 'express'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import { config } from './config/environment'
import logger from './utils/logger'
import { LocalMacOSClient } from './services/localMacOSClient'
import { LLMService } from './services/llmService'
import { ChatService } from './services/chatService'

const app = express()
const server = http.createServer(app)

// Configure CORS for Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}))
app.use(express.json())

// Initialize services
const mcpClient = new LocalMacOSClient()
const llmService = new LLMService()
const chatService = new ChatService(mcpClient, llmService)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mcpConnected: mcpClient.isConnected()
  })
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  // Join a default session room
  socket.join('default-session')

  socket.on('chat_message', async (data) => {
    try {
      logger.info(`Received message from ${socket.id}:`, data)
      
      const { message, sessionId } = data
      
      if (!message || typeof message !== 'string') {
        socket.emit('error', { message: 'Invalid message format' })
        return
      }

      // Emit typing indicator
      socket.emit('typing_start')

      // Process the message through chat service
      const response = await chatService.processMessage(message, sessionId || 'default-session')

      // Stop typing indicator
      socket.emit('typing_stop')

      // Send response back to client
      socket.emit('chat_response', {
        message: response.content,
        timestamp: Date.now(),
        type: response.type,
        imageData: response.imageData,
        toolName: response.toolName
      })

    } catch (error) {
      logger.error('Error processing chat message:', error)
      socket.emit('typing_stop')
      socket.emit('chat_response', {
        message: 'Sorry, I encountered an error processing your request.',
        timestamp: Date.now(),
        type: 'error'
      })
    }
  })

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`)
  })

  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error)
  })
})

// Start server
const startServer = async () => {
  try {
    // Initialize MCP client
    logger.info('Initializing MCP client...')
    await mcpClient.connect()
    logger.info('MCP client connected successfully')

    // Start the server
    server.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`)
      logger.info(`Environment: ${config.server.nodeEnv}`)
      logger.info(`MCP Host: ${config.mcp.host}:${config.mcp.port}`)
    })

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  mcpClient.disconnect()
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  mcpClient.disconnect()
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

startServer() 