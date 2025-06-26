'use client'

import { useState, useEffect } from 'react'

interface TypingIndicatorProps {
  type?: 'thinking' | 'executing' | 'processing'
  toolName?: string
}

export default function TypingIndicator({ type = 'thinking', toolName }: TypingIndicatorProps) {
  const [dots, setDots] = useState('')
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)
    
    return () => clearInterval(interval)
  }, [])

  const getIndicatorContent = () => {
    switch (type) {
      case 'executing':
        return {
          text: toolName ? `Executing ${toolName.replace('remote_macos_', '').replace('_', ' ')}` : 'Executing tool',
          icon: '🔧',
          color: 'text-blue-600'
        }
      case 'processing':
        return {
          text: 'Processing response',
          icon: '⚡',
          color: 'text-purple-600'
        }
      default:
        return {
          text: 'AI is thinking',
          icon: '🤖',
          color: 'text-gray-600'
        }
    }
  }

  const { text, icon, color } = getIndicatorContent()

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg max-w-xs lg:max-w-md shadow-sm">
        <div className="flex items-center space-x-3">
          {/* Animated icon */}
          <div className="text-lg animate-pulse">
            {icon}
          </div>
          
          {/* Content */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className={`text-sm font-medium ${color}`}>
                {text}
              </span>
              <span className={`text-sm ${color} font-mono w-6`}>
                {dots}
              </span>
            </div>
            
            {/* Additional info for tool execution */}
            {type === 'executing' && toolName && (
              <div className="text-xs text-gray-500 mt-1">
                This may take a moment...
              </div>
            )}
          </div>
          
          {/* Animated dots */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
} 