export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool' | 'error' | 'tool_execution';
  content: string;
  timestamp: number;
  imageData?: string;
  toolName?: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface ToolExecution {
  toolName: string;
  arguments: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
} 