'use client'

import ChatInterface from '@/components/Chat/ChatInterface'
import ErrorBoundary from '@/components/UI/ErrorBoundary'

export default function Home() {
  return (
    <ErrorBoundary>
      <main className="h-screen flex flex-col bg-background">
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </main>
    </ErrorBoundary>
  )
} 