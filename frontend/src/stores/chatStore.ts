'use client'

import { create } from 'zustand'
import { ChatMessage } from '@/types/chat'

interface ChatStore {
  messages: ChatMessage[]
  isTyping: boolean
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  clearMessages: () => void
  setTyping: (typing: boolean) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isTyping: false,
  
  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },
  
  updateMessage: (id: string, updates: Partial<ChatMessage>) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }))
  },
  
  clearMessages: () => {
    set({ messages: [] })
  },
  
  setTyping: (typing: boolean) => {
    set({ isTyping: typing })
  }
})) 