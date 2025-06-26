'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface InputAreaProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export default function InputArea({ onSendMessage, disabled = false }: InputAreaProps) {
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const lineHeight = 24 // Approximate line height
      const maxHeight = lineHeight * 6 // Max 6 rows
      const minHeight = lineHeight * 1 // Min 1 row
      
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
      
      const newRows = Math.min(Math.max(Math.ceil(scrollHeight / lineHeight), 1), 6)
      setRows(newRows)
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled && message.length <= 1000) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleQuickAction = (text: string) => {
    setMessage(text)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const isNearLimit = message.length > 800
  const isOverLimit = message.length > 1000

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled 
                ? "Connecting..." 
                : "Ask me to control your Mac... (examples below)"
            }
            disabled={disabled}
            maxLength={1000}
            className={`
              input w-full pr-16 resize-none transition-all duration-200 
              leading-relaxed overflow-hidden
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'shadow-sm focus:shadow-md'}
              ${isOverLimit ? 'border-error focus:border-error' : ''}
            `}
            style={{
              minHeight: '60px',
              maxHeight: '150px'
            }}
          />
          
          {/* Character counter for long messages */}
          {(isNearLimit || isOverLimit) && (
            <div className={`absolute top-2 right-16 text-xs px-2 py-1 rounded ${
              isOverLimit ? 'text-error bg-error-background' : 'text-warning bg-warning-background'
            }`}>
              {message.length}/1000
            </div>
          )}
          
          <button
            type="submit"
            disabled={disabled || !message.trim() || isOverLimit}
            className={`
              absolute right-2 bottom-2 p-2.5 rounded-lg transition-all duration-200
              flex items-center justify-center
              ${disabled || !message.trim() || isOverLimit
                ? 'bg-background-tertiary text-foreground-tertiary cursor-not-allowed' 
                : 'bg-primary text-primary-foreground hover:bg-primary-hover hover:scale-105 shadow-sm hover:shadow-md'
              }
            `}
            title={
              disabled ? "Connecting..." : 
              isOverLimit ? "Message too long" :
              !message.trim() ? "Enter a message" :
              "Send message (Enter)"
            }
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
      
      {/* Quick actions and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-caption text-foreground-secondary">
          <span className="text-foreground-tertiary">💡 Try:</span>
          <button
            onClick={() => handleQuickAction("Take a screenshot")}
            className="text-primary hover:text-primary-hover transition-colors hover:underline"
            disabled={disabled}
          >
            "Take a screenshot"
          </button>
          <span className="text-foreground-tertiary">•</span>
          <button
            onClick={() => handleQuickAction("Open Chrome browser")}
            className="text-primary hover:text-primary-hover transition-colors hover:underline"
            disabled={disabled}
          >
            "Open Chrome"
          </button>
          <span className="text-foreground-tertiary">•</span>
          <button
            onClick={() => handleQuickAction("Click on the center of the screen")}
            className="text-primary hover:text-primary-hover transition-colors hover:underline"
            disabled={disabled}
          >
            "Click center"
          </button>
        </div>
        
        <div className="flex items-center gap-3 text-caption text-foreground-tertiary">
          {message.trim() && (
            <span className={isOverLimit ? 'text-error' : ''}>
              {message.trim().split(/\s+/).length} words
            </span>
          )}
          <span>⌨️ Enter to send • ⇧Enter for new line</span>
        </div>
      </div>
    </div>
  )
} 