import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { MCPClientInterface, MCPTool, MCPToolResult } from '../types/mcp'
import logger from '../utils/logger'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export class LocalMacOSClient implements MCPClientInterface {
  private connected: boolean = false
  private tools: MCPTool[] = []

  async connect(): Promise<void> {
    try {
      logger.info('Initializing local macOS client...')
      
      // Check if we're on macOS
      if (process.platform !== 'darwin') {
        throw new Error('LocalMacOSClient only works on macOS')
      }
      
      // Test if we can run basic commands
      await execAsync('which screencapture')
      
      await this.loadTools()
      
      this.connected = true
      logger.info('Local macOS client connected successfully')
      
    } catch (error) {
      logger.error('Failed to connect to local macOS:', error)
      throw error
    }
  }

  private async loadTools(): Promise<void> {
    this.tools = [
      {
        name: 'remote_macos_get_screen',
        description: 'Take a screenshot of the local macOS desktop',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'remote_macos_mouse_click',
        description: 'Click at specified coordinates on the local macOS screen',
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
        name: 'remote_macos_send_keys',
        description: 'Send keyboard input to the local macOS system',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to type' },
            special_key: { 
              type: 'string', 
              description: 'Special key to press',
              enum: ['enter', 'return', 'backspace', 'delete', 'tab', 'space', 'escape', 'up', 'down', 'left', 'right']
            },
            key_combo: { type: 'string', description: 'Key combination like "cmd+c", "cmd+v", etc.' }
          }
        }
      },
      {
        name: 'remote_macos_open_application',
        description: 'Open an application on the local macOS system',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Application name or path' }
          },
          required: ['identifier']
        }
      }
    ]
  }

  async listTools(): Promise<MCPTool[]> {
    return this.tools
  }

  async callTool(name: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.connected) {
      throw new Error('Local macOS client not connected')
    }

    try {
      switch (name) {
        case 'remote_macos_get_screen':
          return await this.takeScreenshot()
        
        case 'remote_macos_mouse_click':
          return await this.mouseClick(args)
        
        case 'remote_macos_send_keys':
          return await this.sendKeys(args)
        
        case 'remote_macos_open_application':
          return await this.openApplication(args)
        
        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    } catch (error) {
      logger.error(`Error calling tool ${name}:`, error)
      return {
        success: false,
        error: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async takeScreenshot(): Promise<MCPToolResult> {
    try {
      const tempDir = os.tmpdir()
      const filename = `screenshot_${Date.now()}.png`
      const filepath = path.join(tempDir, filename)
      
      // Use macOS screencapture command
      await execAsync(`screencapture -x "${filepath}"`)
      
      // Read the file and convert to base64
      const imageData = fs.readFileSync(filepath)
      const base64Data = imageData.toString('base64')
      
      // Clean up temp file
      fs.unlinkSync(filepath)
      
      // Get screen dimensions
      const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep Resolution')
      const resolutionMatch = stdout.match(/(\d+) x (\d+)/)
      const width = resolutionMatch ? parseInt(resolutionMatch[1]) : 1920
      const height = resolutionMatch ? parseInt(resolutionMatch[2]) : 1080
      
      return {
        success: true,
        imageData: base64Data,
        content: `Screenshot taken successfully. Screen resolution: ${width}x${height}`
      }
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async mouseClick(args: Record<string, any>): Promise<MCPToolResult> {
    const { x, y, source_width = 1366, source_height = 768 } = args
    
    if (x === undefined || y === undefined) {
      throw new Error('x and y coordinates are required')
    }

    try {
      // Get actual screen dimensions
      const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep Resolution')
      const resolutionMatch = stdout.match(/(\d+) x (\d+)/)
      const actualWidth = resolutionMatch ? parseInt(resolutionMatch[1]) : 1920
      const actualHeight = resolutionMatch ? parseInt(resolutionMatch[2]) : 1080
      
      // Scale coordinates
      const scaledX = Math.round((x / source_width) * actualWidth)
      const scaledY = Math.round((y / source_height) * actualHeight)
      
      // Use cliclick for mouse control (install with: brew install cliclick)
      await execAsync(`cliclick c:${scaledX},${scaledY}`)
      
      return {
        success: true,
        content: `Mouse clicked at (${scaledX}, ${scaledY}) - scaled from source (${x}, ${y})`
      }
    } catch (error) {
      // Fallback to AppleScript
      try {
        const scaledX = Math.round((x / source_width) * 1920) // Fallback dimensions
        const scaledY = Math.round((y / source_height) * 1080)
        
        await execAsync(`osascript -e 'tell application "System Events" to click at {${scaledX}, ${scaledY}}'`)
        
        return {
          success: true,
          content: `Mouse clicked at (${scaledX}, ${scaledY}) using AppleScript fallback`
        }
      } catch (fallbackError) {
        throw new Error(`Failed to click mouse: ${error instanceof Error ? error.message : 'Unknown error'}. Try installing cliclick with: brew install cliclick`)
      }
    }
  }

  private async sendKeys(args: Record<string, any>): Promise<MCPToolResult> {
    const { text, special_key, key_combo } = args
    
    try {
      if (text) {
        // Type text using AppleScript
        const escapedText = text.replace(/"/g, '\\"').replace(/\\/g, '\\\\')
        await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escapedText}"'`)
        
        return {
          success: true,
          content: `Typed text: "${text}"`
        }
      } else if (special_key) {
        // Handle special keys
        const keyMap: Record<string, string> = {
          'enter': 'return',
          'return': 'return',
          'backspace': 'delete',
          'delete': 'forward delete',
          'tab': 'tab',
          'space': 'space',
          'escape': 'escape',
          'up': 'up arrow',
          'down': 'down arrow',
          'left': 'left arrow',
          'right': 'right arrow'
        }
        
        const macKey = keyMap[special_key] || special_key
        await execAsync(`osascript -e 'tell application "System Events" to key code (key code of "${macKey}")'`)
        
        return {
          success: true,
          content: `Pressed special key: ${special_key}`
        }
      } else if (key_combo) {
        // Handle key combinations like "cmd+c"
        const combo = key_combo.toLowerCase().replace(/\+/g, ' ')
        await execAsync(`osascript -e 'tell application "System Events" to keystroke "${combo}"'`)
        
        return {
          success: true,
          content: `Pressed key combination: ${key_combo}`
        }
      } else {
        throw new Error('Either text, special_key, or key_combo must be provided')
      }
    } catch (error) {
      throw new Error(`Failed to send keys: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async openApplication(args: Record<string, any>): Promise<MCPToolResult> {
    const { identifier } = args
    
    if (!identifier) {
      throw new Error('Application identifier is required')
    }

    try {
      // Try to open the application
      await execAsync(`open -a "${identifier}"`)
      
      return {
        success: true,
        content: `Successfully opened application: ${identifier}`
      }
    } catch (error) {
      throw new Error(`Failed to open application "${identifier}": ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  disconnect(): void {
    this.connected = false
    logger.info('Local macOS client disconnected')
  }

  async getScreenDimensions(): Promise<{ width: number, height: number } | null> {
    try {
      const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep Resolution')
      const resolutionMatch = stdout.match(/(\d+) x (\d+)/)
      
      if (resolutionMatch) {
        return {
          width: parseInt(resolutionMatch[1]),
          height: parseInt(resolutionMatch[2])
        }
      }
      
      return { width: 1920, height: 1080 } // Fallback
    } catch (error) {
      logger.warn('Failed to get screen dimensions:', error)
      return null
    }
  }
} 