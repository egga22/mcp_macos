'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { ConnectionStatus } from '@/types/chat'
import { useChatStore } from '@/stores/chatStore'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false
  })
  
  const { addMessage, setTyping, updateMessage } = useChatStore()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectTimeout = useRef<NodeJS.Timeout>()

  // Cleanup function
  const cleanup = useCallback(() => {
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
    }
    setSocket(null)
  }, [socket])

  const connectSocket = useCallback(() => {
    // Clean up existing connection
    cleanup()
    
    setConnectionStatus({ connected: false, connecting: true })
    
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      reconnection: false // We'll handle reconnection manually
    })

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnectionStatus({ connected: true, connecting: false })
      reconnectAttempts.current = 0
      setSocket(newSocket)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
      setConnectionStatus({ connected: false, connecting: false })
      setSocket(null)
      
      // Attempt reconnection if disconnect wasn't intentional
      if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect()
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnectionStatus({ 
        connected: false, 
        connecting: false, 
        error: 'Failed to connect to server' 
      })
      
      if (reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect()
      } else {
        setConnectionStatus({
          connected: false,
          connecting: false,
          error: 'Unable to connect after multiple attempts'
        })
      }
    })

    // Chat message handlers
    newSocket.on('chat_response', (data) => {
      addMessage({
        id: Date.now().toString(),
        type: data.type || 'assistant',
        content: data.message,
        timestamp: data.timestamp || Date.now(),
        imageData: data.imageData,
        toolName: data.toolName
      })
    })

    // Typing indicators
    newSocket.on('typing_start', () => {
      setTyping(true)
    })

    newSocket.on('typing_stop', () => {
      setTyping(false)
    })

    // Tool execution events
    newSocket.on('tool_execution_start', (data) => {
      addMessage({
        id: `tool-${Date.now()}`,
        type: 'system',
        content: `🔧 Executing: ${data.toolName?.replace('remote_macos_', '').replace('_', ' ') || 'tool'}`,
        timestamp: Date.now(),
        toolName: data.toolName
      })
    })

    newSocket.on('tool_execution_progress', (data) => {
      addMessage({
        id: `progress-${Date.now()}`,
        type: 'system',
        content: `⚡ ${data.message}`,
        timestamp: Date.now(),
        toolName: data.toolName
      })
    })

    newSocket.on('tool_execution_complete', (data) => {
      if (!data.success) {
        addMessage({
          id: Date.now().toString(),
          type: 'error',
          content: `❌ Tool execution failed: ${data.error || 'Unknown error'}`,
          timestamp: Date.now(),
          toolName: data.toolName
        })
      }
    })

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
      addMessage({
        id: Date.now().toString(),
        type: 'error',
        content: `⚠️ Connection error: ${error.message || 'Unknown error'}`,
        timestamp: Date.now()
      })
    })

    // Health check response
    newSocket.on('health_check_response', (data) => {
      console.log('Health check response:', data)
    })

    return newSocket
  }, [addMessage, setTyping, cleanup])

  const scheduleReconnect = useCallback(() => {
    reconnectAttempts.current += 1
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000) // Exponential backoff, max 10s
    
    console.log(`Scheduling reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`)
    
    setConnectionStatus({
      connected: false,
      connecting: true,
      error: `Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`
    })

    reconnectTimeout.current = setTimeout(() => {
      if (reconnectAttempts.current <= maxReconnectAttempts) {
        connectSocket()
      }
    }, delay)
  }, [connectSocket])

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0
    connectSocket()
  }, [connectSocket])

  // Health check function
  const healthCheck = useCallback(() => {
    if (socket?.connected) {
      socket.emit('health_check')
    }
  }, [socket])

  // Send message with error handling
  const sendMessage = useCallback((message: string, sessionId: string = 'default-session') => {
    if (!socket?.connected) {
      addMessage({
        id: Date.now().toString(),
        type: 'error',
        content: '❌ Not connected to server. Please wait for reconnection.',
        timestamp: Date.now()
      })
      return false
    }

    try {
      socket.emit('chat_message', {
        message,
        sessionId
      })
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage({
        id: Date.now().toString(),
        type: 'error',
        content: '❌ Failed to send message. Please try again.',
        timestamp: Date.now()
      })
      return false
    }
  }, [socket, addMessage])

  useEffect(() => {
    connectSocket()

    // Periodic health check
    const healthCheckInterval = setInterval(() => {
      healthCheck()
    }, 30000) // Every 30 seconds

    return () => {
      clearInterval(healthCheckInterval)
      cleanup()
    }
  }, []) // Only run once on mount

  return { 
    socket, 
    connectionStatus, 
    reconnect, 
    healthCheck,
    sendMessage,
    isConnected: socket?.connected || false
  }
} 