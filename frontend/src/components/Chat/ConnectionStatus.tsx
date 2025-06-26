'use client'

import { ConnectionStatus as ConnectionStatusType } from '@/types/chat'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline'

interface ConnectionStatusProps {
  status: ConnectionStatusType
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  if (status.connected) {
    return null // Don't show anything when connected
  }

  return (
    <div className={`px-4 py-2 text-sm ${
      status.error 
        ? 'bg-red-50 text-red-700 border-b border-red-200' 
        : 'bg-yellow-50 text-yellow-700 border-b border-yellow-200'
    }`}>
      <div className="flex items-center justify-center space-x-2 max-w-4xl mx-auto">
        {status.connecting ? (
          <>
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            <span>Connecting to server...</span>
          </>
        ) : status.error ? (
          <>
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>Connection error: {status.error}</span>
          </>
        ) : (
          <>
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>Disconnected from server</span>
          </>
        )}
      </div>
    </div>
  )
} 