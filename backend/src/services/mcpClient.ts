import { spawn, ChildProcess } from 'child_process'
import { MCPClientInterface, MCPTool, MCPToolResult } from '../types/mcp'
import { config } from '../config/environment'
import logger from '../utils/logger'

export class MCPClient implements MCPClientInterface {
  private mcpProcess: ChildProcess | null = null
  private connected: boolean = false
  private tools: MCPTool[] = []
  private responseBuffer: string = ''
  private pendingRequests: Map<number, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }> = new Map()

  async connect(): Promise<void> {
    try {
      logger.info('Starting MCP server process...')
      
      // Start the MCP server using Docker
      this.mcpProcess = spawn('docker', [
        'run',
        '-i',
        '--rm',
        '-e', `MACOS_HOST=${config.mcp.host}`,
        '-e', `MACOS_PASSWORD=${config.mcp.password}`,
        '-e', `MACOS_USERNAME=${config.mcp.username}`,
        '-e', `MACOS_PORT=${config.mcp.port}`,
        '-e', `VNC_ENCRYPTION=${config.mcp.encryption}`,
        'buryhuang/mcp-remote-macos-use:latest'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.mcpProcess.on('error', (error) => {
        logger.error('MCP process error:', error)
        this.connected = false
        this.rejectPendingRequests(error)
      })

      this.mcpProcess.on('exit', (code) => {
        logger.info(`MCP process exited with code ${code}`)
        this.connected = false
        this.rejectPendingRequests(new Error(`MCP process exited with code ${code}`))
      })

      // Handle process output with proper JSON parsing
      this.mcpProcess.stdout?.on('data', (data) => {
        this.handleProcessOutput(data)
      })

      this.mcpProcess.stderr?.on('data', (data) => {
        logger.warn('MCP stderr:', data.toString())
      })

      // Wait a moment for the process to start
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Load available tools
      await this.loadTools()
      
      this.connected = true
      logger.info('MCP client connected successfully')
      
    } catch (error) {
      logger.error('Failed to connect to MCP server:', error)
      throw error
    }
  }

  private handleProcessOutput(data: Buffer): void {
    this.responseBuffer += data.toString()
    
    // Try to parse complete JSON responses
    const lines = this.responseBuffer.split('\n')
    this.responseBuffer = lines.pop() || '' // Keep incomplete line
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line.trim())
          this.handleResponse(response)
        } catch (error) {
          logger.warn('Failed to parse MCP response:', line)
        }
      }
    }
  }

  private handleResponse(response: any): void {
    if (response.id && this.pendingRequests.has(response.id)) {
      const request = this.pendingRequests.get(response.id)!
      this.pendingRequests.delete(response.id)
      clearTimeout(request.timeout)
      request.resolve(response)
    }
  }

  private rejectPendingRequests(error: Error): void {
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout)
      request.reject(error)
    }
    this.pendingRequests.clear()
  }

  private async loadTools(): Promise<void> {
    // Define comprehensive set of available tools based on the MCP server capabilities
    this.tools = [
      {
        name: 'remote_macos_get_screen',
        description: 'Take a screenshot of the remote macOS desktop to see what\'s currently displayed',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'remote_macos_mouse_click',
        description: 'Click at specified coordinates on the remote macOS screen',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'integer', description: 'X coordinate to click' },
            y: { type: 'integer', description: 'Y coordinate to click' },
            source_width: { type: 'integer', description: 'Source screen width for coordinate scaling', default: 1366 },
            source_height: { type: 'integer', description: 'Source screen height for coordinate scaling', default: 768 },
            button: { type: 'integer', description: 'Mouse button: 1=left, 2=middle, 3=right', default: 1 }
          },
          required: ['x', 'y']
        }
      },
      {
        name: 'remote_macos_mouse_double_click',
        description: 'Double-click at specified coordinates on the remote macOS screen',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'integer', description: 'X coordinate to double-click' },
            y: { type: 'integer', description: 'Y coordinate to double-click' },
            source_width: { type: 'integer', description: 'Source screen width for coordinate scaling', default: 1366 },
            source_height: { type: 'integer', description: 'Source screen height for coordinate scaling', default: 768 }
          },
          required: ['x', 'y']
        }
      },
      {
        name: 'remote_macos_mouse_move',
        description: 'Move the mouse cursor to specified coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'integer', description: 'X coordinate to move to' },
            y: { type: 'integer', description: 'Y coordinate to move to' },
            source_width: { type: 'integer', description: 'Source screen width for coordinate scaling', default: 1366 },
            source_height: { type: 'integer', description: 'Source screen height for coordinate scaling', default: 768 }
          },
          required: ['x', 'y']
        }
      },
      {
        name: 'remote_macos_mouse_scroll',
        description: 'Scroll at specified coordinates in a given direction',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'integer', description: 'X coordinate to scroll at' },
            y: { type: 'integer', description: 'Y coordinate to scroll at' },
            direction: { type: 'string', description: 'Scroll direction: up, down, left, right', enum: ['up', 'down', 'left', 'right'] },
            clicks: { type: 'integer', description: 'Number of scroll clicks', default: 3 }
          },
          required: ['x', 'y', 'direction']
        }
      },
      {
        name: 'remote_macos_mouse_drag_n_drop',
        description: 'Drag from one location to another (drag and drop operation)',
        inputSchema: {
          type: 'object',
          properties: {
            start_x: { type: 'integer', description: 'Starting X coordinate' },
            start_y: { type: 'integer', description: 'Starting Y coordinate' },
            end_x: { type: 'integer', description: 'Ending X coordinate' },
            end_y: { type: 'integer', description: 'Ending Y coordinate' },
            source_width: { type: 'integer', description: 'Source screen width for coordinate scaling', default: 1366 },
            source_height: { type: 'integer', description: 'Source screen height for coordinate scaling', default: 768 }
          },
          required: ['start_x', 'start_y', 'end_x', 'end_y']
        }
      },
      {
        name: 'remote_macos_send_keys',
        description: 'Send keyboard input to the remote macOS system - can type text, special keys, or key combinations',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to type (use this for regular text input)' },
            special_key: { 
              type: 'string', 
              description: 'Special key to press',
              enum: ['enter', 'return', 'backspace', 'delete', 'tab', 'space', 'escape', 'esc', 'up', 'down', 'left', 'right', 'home', 'end', 'page_up', 'page_down', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12']
            },
            key_combination: { 
              type: 'string', 
              description: 'Key combination like cmd+c, cmd+v, cmd+shift+4, ctrl+alt+delete, etc.',
              examples: ['cmd+c', 'cmd+v', 'cmd+a', 'cmd+z', 'cmd+shift+4', 'cmd+space', 'cmd+tab', 'ctrl+alt+delete']
            }
          },
          required: []
        }
      },
      {
        name: 'remote_macos_open_application',
        description: 'Open or activate an application on the remote macOS system',
        inputSchema: {
          type: 'object',
          properties: {
            application_name: { 
              type: 'string', 
              description: 'Name of the application to open (e.g., Safari, Chrome, Terminal, Finder, etc.)',
              examples: ['Safari', 'Google Chrome', 'Terminal', 'Finder', 'System Preferences', 'TextEdit', 'Calculator']
            }
          },
          required: ['application_name']
        }
      }
    ]
    
    logger.info(`Loaded ${this.tools.length} MCP tools`)
  }

  async listTools(): Promise<MCPTool[]> {
    return this.tools
  }

  async callTool(name: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.connected || !this.mcpProcess) {
      throw new Error('MCP client not connected')
    }

    try {
      logger.info(`Calling MCP tool: ${name}`, args)

      // Create MCP request with unique ID
      const requestId = Date.now() + Math.random()
      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name,
          arguments: args
        }
      }

      // Send request to MCP server
      const requestString = JSON.stringify(request) + '\n'
      
      if (!this.mcpProcess.stdin?.writable) {
        throw new Error('MCP process stdin not writable')
      }
      
      this.mcpProcess.stdin.write(requestString)

      // Wait for response with promise-based approach
      const response = await this.waitForResponse(requestId)

      if (response.error) {
        return {
          success: false,
          error: response.error.message || 'Unknown MCP error',
          toolName: name
        }
      }

      // Handle different tool responses
      const result = response.result
      if (result && result.content) {
        const content = result.content[0]
        
        if (content.type === 'image') {
          return {
            success: true,
            data: result,
            imageData: content.data,
            toolName: name
          }
        } else {
          return {
            success: true,
            data: result,
            content: content.text || content.data || 'Tool executed successfully',
            toolName: name
          }
        }
      }

      return {
        success: true,
        data: result,
        content: 'Tool executed successfully',
        toolName: name
      }

    } catch (error) {
      logger.error(`Error calling MCP tool ${name}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName: name
      }
    }
  }

  private async waitForResponse(requestId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error('MCP request timeout'))
      }, 45000) // 45 second timeout for potentially slow operations

      this.pendingRequests.set(requestId, { resolve, reject, timeout })
    })
  }

  isConnected(): boolean {
    return this.connected
  }

  disconnect(): void {
    if (this.mcpProcess) {
      this.mcpProcess.kill()
      this.mcpProcess = null
    }
    this.connected = false
    this.rejectPendingRequests(new Error('MCP client disconnected'))
    logger.info('MCP client disconnected')
  }

  // Utility method to get screen dimensions for coordinate scaling
  async getScreenDimensions(): Promise<{ width: number, height: number } | null> {
    try {
      const result = await this.callTool('remote_macos_get_screen', {})
      if (result.success && result.data && result.data.dimensions) {
        return result.data.dimensions
      }
    } catch (error) {
      logger.warn('Failed to get screen dimensions:', error)
    }
    return null
  }
} 