'use client'

import { useState, useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import InputArea from './InputArea'
import TypingIndicator from './TypingIndicator'
import ConnectionStatus from './ConnectionStatus'
import ThemeToggle from '../UI/ThemeToggle'
import SettingsPanel from '../UI/SettingsPanel'
import { useSocket } from '@/hooks/useSocket'
import { useChatStore } from '@/stores/chatStore'
import { useThemeStore } from '@/stores/themeStore'
import { ChatMessage } from '@/types/chat'
import { Cog6ToothIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function ChatInterface() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { socket, connectionStatus, reconnect, sendMessage, isConnected } = useSocket()
  const { messages, addMessage, isTyping, clearMessages } = useChatStore()
  const { initTheme } = useThemeStore()
  const [sessionId, setSessionId] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([])

  // Initialize sessionId on client side to prevent hydration mismatch
  useEffect(() => {
    setSessionId(`session-${Date.now()}`)
  }, [])

  // Initialize theme on mount
  useEffect(() => {
    initTheme()
  }, [initTheme])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Filter messages based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMessages(messages)
    } else {
      const filtered = messages.filter(message =>
        message.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredMessages(filtered)
    }
  }, [messages, searchQuery])

  const handleSendMessage = (content: string) => {
    if (!isConnected) {
      console.error('Socket not connected')
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: Date.now(),
      status: 'sending'
    }

    addMessage(userMessage)

    // Use the enhanced sendMessage function
    const success = sendMessage(content, sessionId)
    
    if (success) {
      // Update message status to sent
      setTimeout(() => {
        // In a real implementation, we'd wait for server confirmation
        // For now, we'll just mark as sent after a short delay
        userMessage.status = 'sent'
      }, 500)
    } else {
      userMessage.status = 'error'
    }
  }

  const handleClearChat = () => {
    clearMessages()
  }

  const handleReconnect = () => {
    reconnect()
  }

  const renderWelcomeMessage = () => (
    <div className="text-center text-gray-500 mt-8 px-4">
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-medium mb-3 text-gray-700">
          🤖 AI macOS Control Assistant
        </h3>
        <p className="text-sm mb-4 leading-relaxed">
          I can help you control your Mac through natural language! Here's what I can do:
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-medium text-gray-700 mb-1">📸 Screen Control</div>
            <div className="text-gray-600">"Take a screenshot"</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-medium text-gray-700 mb-1">🖱️ Mouse Actions</div>
            <div className="text-gray-600">"Click on the dock"</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-medium text-gray-700 mb-1">⌨️ Keyboard Input</div>
            <div className="text-gray-600">"Type hello world"</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-medium text-gray-700 mb-1">🚀 Applications</div>
            <div className="text-gray-600">"Open Safari"</div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-400">
          Examples: "Take a screenshot and click on the desktop", "Open Terminal and type ls"
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full max-w-5xl mx-auto flex flex-col bg-background">
      {/* Enhanced Header */}
      <div className="border-b border-default bg-background-elevated">
        <ConnectionStatus status={connectionStatus} />
        
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                isConnected ? 'bg-success animate-pulse' : 'bg-error'
              }`}></div>
              <span className="text-body text-foreground-secondary">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-tertiary" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 pr-4 py-2 w-64 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-foreground-tertiary hover:text-foreground-secondary"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            
            {!isConnected && (
              <button
                onClick={handleReconnect}
                className="btn-primary text-sm"
              >
                Reconnect
              </button>
            )}
            
            <button
              onClick={() => setShowSettings(true)}
              className="btn-secondary p-2"
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            
            <div className="text-caption text-foreground-tertiary">
              {filteredMessages.filter(m => m.type === 'user').length} / {messages.filter(m => m.type === 'user').length} messages
              {searchQuery && ` (filtered)`}
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        {filteredMessages.length === 0 && messages.length === 0 ? (
          renderWelcomeMessage()
        ) : filteredMessages.length === 0 && searchQuery ? (
          <div className="text-center text-foreground-secondary mt-8 px-4">
            <div className="max-w-md mx-auto">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
              <h3 className="text-subheading mb-2">No messages found</h3>
              <p className="text-body">
                No messages match your search for "{searchQuery}". Try a different search term.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="btn-primary mt-4"
              >
                Clear Search
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <div key={message.id} className="animate-fade-in">
                <MessageBubble message={message} />
              </div>
            ))}
          </div>
        )}
        
        {isTyping && (
          <div className="animate-fade-in">
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      <div className="border-t border-default bg-background-elevated p-6">
        <InputArea 
          onSendMessage={handleSendMessage}
          disabled={!isConnected}
        />
        
        {/* Enhanced Status bar */}
        <div className="mt-3 flex items-center justify-between text-caption text-foreground-secondary">
          <div className="flex items-center space-x-4">
            <span>Session: {sessionId.slice(-8)}</span>
            {connectionStatus.error && (
              <span className="text-error bg-error-background px-2 py-1 rounded">
                {connectionStatus.error}
              </span>
            )}
            {searchQuery && (
              <span className="text-accent">
                Showing {filteredMessages.length} of {messages.length} messages
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span>⌨️ Enter to send • ⇧Enter for new line</span>
            <span>•</span>
            <span className="text-foreground-tertiary">Phase 3 Ready</span>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  )
} 