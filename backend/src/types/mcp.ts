export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

export interface MCPToolCall {
  name: string
  arguments: Record<string, any>
}

export interface MCPToolResult {
  success: boolean
  data?: any
  error?: string
  imageData?: string
  toolName?: string
  content?: string
}

export interface MCPClientInterface {
  listTools(): Promise<MCPTool[]>
  callTool(name: string, args: Record<string, any>): Promise<MCPToolResult>
  isConnected(): boolean
  connect(): Promise<void>
  disconnect(): void
} 