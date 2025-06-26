'use client'

import { useState } from 'react'
import { XMarkIcon, Cog6ToothIcon, TrashIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'
import { useChatStore } from '@/stores/chatStore'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { messages, clearMessages } = useChatStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleClearChat = () => {
    clearMessages()
    setShowClearConfirm(false)
  }

  const handleExportChat = () => {
    const chatData = {
      messages,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length
    }
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Settings Panel */}
      <div className="fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-background-elevated border-l border-default z-50 animate-slide-in">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <Cog6ToothIcon className="w-6 h-6 text-foreground-secondary" />
              <h2 className="text-heading">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="btn-secondary p-2"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Appearance */}
            <section className="space-y-4">
              <h3 className="text-subheading">Appearance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-body font-medium">Theme</label>
                    <p className="text-caption">Choose your preferred color scheme</p>
                  </div>
                  <ThemeToggle variant="dropdown" />
                </div>
              </div>
            </section>

            {/* Chat Management */}
            <section className="space-y-4">
              <h3 className="text-subheading">Chat Management</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-body font-medium">Messages</span>
                    <p className="text-caption">{messages.length} messages in current session</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportChat}
                    className="btn-secondary flex-1"
                    disabled={messages.length === 0}
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Export Chat
                  </button>
                  
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="btn-secondary text-error hover:bg-error/10"
                    disabled={messages.length === 0}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Clear
                  </button>
                </div>

                {/* Clear confirmation */}
                {showClearConfirm && (
                  <div className="bg-warning-background border border-warning rounded-lg p-4">
                    <p className="text-body text-warning mb-3">
                      Are you sure you want to clear all chat messages? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearChat}
                        className="btn-primary bg-error hover:bg-error-hover text-white flex-1"
                      >
                        Yes, Clear All
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Connection */}
            <section className="space-y-4">
              <h3 className="text-subheading">Connection</h3>
              <div className="space-y-3">
                <div className="bg-background-secondary rounded-lg p-4 border border-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-medium">Backend Server</span>
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                  </div>
                  <p className="text-caption">Connected to localhost:3001</p>
                </div>

                <div className="bg-background-secondary rounded-lg p-4 border border-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-medium">MCP Server</span>
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                  </div>
                  <p className="text-caption">Docker container running</p>
                </div>
              </div>
            </section>

            {/* About */}
            <section className="space-y-4">
              <h3 className="text-subheading">About</h3>
              <div className="bg-background-secondary rounded-lg p-4 border border-default">
                <h4 className="text-body font-medium mb-2">AI macOS Control</h4>
                <p className="text-caption mb-3">
                  An intelligent assistant for controlling your Mac through natural language commands.
                </p>
                <div className="space-y-2 text-caption">
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phase:</span>
                    <span>3 (Production Ready)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LLM Provider:</span>
                    <span>OpenRouter (GPT-4)</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-default p-6">
            <div className="flex items-center justify-between text-caption">
              <span>AI macOS Control</span>
              <span>Phase 3</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 