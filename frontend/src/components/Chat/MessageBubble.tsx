'use client'

import { ChatMessage } from '@/types/chat'
import { formatDistanceToNow } from 'date-fns'
import { CheckIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [imageExpanded, setImageExpanded] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'
  const isError = message.type === 'error' || message.content.includes('❌')
  const isSuccess = message.content.includes('✅') || message.content.includes('📸')
  
  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
  }

  const toggleImageExpanded = () => {
    setImageExpanded(!imageExpanded)
  }

  const getBubbleStyles = () => {
    if (isUser) {
      return 'bg-primary text-primary-foreground ml-auto shadow-sm'
    }
    if (isError) {
      return 'status-error border border-error rounded-lg'
    }
    if (isSuccess) {
      return 'status-success border border-success rounded-lg'
    }
    if (isSystem) {
      return 'bg-background-tertiary text-foreground-secondary border border-default'
    }
    return 'bg-background-elevated text-foreground border border-default shadow-sm'
  }

  const getToolIcon = (toolName?: string) => {
    if (!toolName) return '🤖'
    
    const iconMap: Record<string, string> = {
      'remote_macos_get_screen': '📸',
      'remote_macos_mouse_click': '🖱️',
      'remote_macos_mouse_double_click': '🖱️',
      'remote_macos_mouse_move': '↗️',
      'remote_macos_mouse_scroll': '🔄',
      'remote_macos_mouse_drag_n_drop': '↔️',
      'remote_macos_send_keys': '⌨️',
      'remote_macos_open_application': '🚀'
    }
    
    return iconMap[toolName] || '🔧'
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg transition-all duration-200 hover:shadow-md ${getBubbleStyles()}`}>
        {/* Tool indicator at the top */}
        {message.toolName && (
          <div className={`flex items-center gap-2 mb-2 text-xs ${
            isUser ? 'text-blue-100' : 'text-gray-600'
          }`}>
            <span>{getToolIcon(message.toolName)}</span>
            <span className="font-medium">
              {message.toolName.replace('remote_macos_', '').replace('_', ' ')}
            </span>
          </div>
        )}
        
        {/* Message Content */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        {/* Image if present */}
        {message.imageData && (
          <div className="mt-3">
            <div className="relative">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              <img
                src={`data:image/png;base64,${message.imageData}`}
                alt="Screenshot"
                className={`rounded border max-w-full h-auto cursor-pointer transition-opacity ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                } ${imageExpanded ? 'max-w-none w-auto max-h-screen' : 'max-h-96'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                onClick={toggleImageExpanded}
              />
              
              {/* Image controls */}
              {!imageLoading && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleImageExpanded()
                    }}
                    className="p-1 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded transition-all"
                    title={imageExpanded ? 'Collapse' : 'Expand'}
                  >
                    {imageExpanded ? (
                      <MagnifyingGlassIcon className="w-4 h-4" />
                    ) : (
                      <ArrowsPointingOutIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {/* Image info */}
            <div className="mt-2 text-xs opacity-75">
              Click to {imageExpanded ? 'collapse' : 'expand'} • Screenshot
            </div>
          </div>
        )}
        
        {/* Timestamp and status */}
        <div className={`flex items-center justify-between mt-2 text-xs transition-opacity group-hover:opacity-100 ${
          isUser ? 'text-primary-foreground/70' : 'text-foreground-secondary'
        }`}>
          <span>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
          
          {isUser && message.status && (
            <span className="ml-2">
              {message.status === 'sending' && (
                <div className="w-3 h-3 border border-blue-200 border-t-transparent rounded-full animate-spin" />
              )}
              {message.status === 'sent' && (
                <CheckIcon className="w-3 h-3" />
              )}
              {message.status === 'error' && (
                <ExclamationTriangleIcon className="w-3 h-3 text-red-300" />
              )}
            </span>
          )}
        </div>
      </div>
      
      {/* Expanded image overlay */}
      {imageExpanded && message.imageData && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={toggleImageExpanded}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={`data:image/png;base64,${message.imageData}`}
              alt="Screenshot (expanded)"
              className="max-w-full max-h-full object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={toggleImageExpanded}
              className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 