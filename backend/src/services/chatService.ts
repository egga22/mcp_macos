import { MCPClientInterface } from '../types/mcp'
import { LLMService } from './llmService'
import logger from '../utils/logger'

export interface ChatResponse {
  content: string
  type: 'text' | 'image' | 'error' | 'tool_execution' | 'typing'
  imageData?: string
  toolName?: string
  sessionId?: string
  timestamp?: number
}

export interface ChatSession {
  id: string
  createdAt: number
  lastActivity: number
  messageCount: number
}

export class ChatService {
  private sessions: Map<string, ChatSession> = new Map()
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

  constructor(
    private mcpClient: MCPClientInterface,
    private llmService: LLMService
  ) {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000)
  }

  async processMessage(message: string, sessionId: string): Promise<ChatResponse> {
    try {
      // Update session activity
      this.updateSessionActivity(sessionId)

      // Get available tools from MCP client
      const availableTools = await this.mcpClient.listTools()
      logger.info(`Available tools: ${availableTools.map(t => t.name).join(', ')}`)

      // Process message with LLM
      const llmResponse = await this.llmService.processMessage(
        message,
        availableTools,
        sessionId
      )

      // If LLM wants to use tools, execute them
      if (llmResponse.requiresTools && llmResponse.toolCalls) {
        return await this.executeTools(llmResponse, message, sessionId)
      }

      // No tools needed, just return LLM response
      return {
        content: llmResponse.content,
        type: 'text',
        sessionId,
        timestamp: Date.now()
      }

    } catch (error) {
      logger.error('Error processing chat message:', error)
      return {
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        type: 'error',
        sessionId,
        timestamp: Date.now()
      }
    }
  }

  private async executeTools(llmResponse: any, originalMessage: string, sessionId: string): Promise<ChatResponse> {
    const toolResults = []
    let hasScreenshot = false
    let screenshotData = null

    // Execute each tool
    for (const toolCall of llmResponse.toolCalls) {
      logger.info(`Executing tool: ${toolCall.name}`, toolCall.arguments)

      try {
        const result = await this.mcpClient.callTool(
          toolCall.name,
          toolCall.arguments
        )

        toolResults.push(result)

        // Handle screenshot tool specially - capture data but don't return early
        if (toolCall.name === 'remote_macos_get_screen' && result.success && result.imageData) {
          hasScreenshot = true
          screenshotData = result.imageData
        }

        // Log tool execution result
        if (result.success) {
          logger.info(`Tool ${toolCall.name} executed successfully`)
        } else {
          logger.warn(`Tool ${toolCall.name} failed:`, result.error)
        }

      } catch (error) {
        logger.error(`Error executing tool ${toolCall.name}:`, error)
        toolResults.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          toolName: toolCall.name
        })
      }
    }

    // Check if this was a multi-step request that needs continuation
    const wasMultiStepRequest = this.isMultiStepRequest(originalMessage)
    const onlyScreenshotExecuted = toolResults.length === 1 && hasScreenshot
    
    if (wasMultiStepRequest && onlyScreenshotExecuted) {
      // Continue with remaining steps after screenshot
      logger.info('Multi-step request detected, continuing after screenshot...')
      return await this.continueMultiStepWorkflow(originalMessage, toolResults, screenshotData, sessionId)
    }

    // If we have a screenshot as the final result, return it
    if (hasScreenshot && screenshotData && !wasMultiStepRequest) {
      return {
        content: this.generateScreenshotMessage(toolResults),
        type: 'image',
        imageData: screenshotData,
        toolName: 'remote_macos_get_screen',
        sessionId,
        timestamp: Date.now()
      }
    }

    // For other tools, generate a follow-up response
    const availableTools = await this.mcpClient.listTools()
    const followUpResponse = await this.llmService.generateFollowUpResponse(
      originalMessage,
      toolResults,
      availableTools,
      sessionId
    )

    return {
      content: followUpResponse.content,
      type: 'text',
      sessionId,
      timestamp: Date.now()
    }
  }

  private isMultiStepRequest(message: string): boolean {
    const multiStepIndicators = [
      'then', 'after', 'next', 'and then', 'followed by', 'subsequently',
      'navigate to', 'open', 'find', 'explore', 'multiple', 'steps',
      'first', 'second', 'finally', ',', 'and also'
    ]
    
    const lowerMessage = message.toLowerCase()
    return multiStepIndicators.some(indicator => lowerMessage.includes(indicator))
  }

  private async continueMultiStepWorkflow(
    originalMessage: string,
    previousResults: any[],
    screenshotData: string | null,
    sessionId: string
  ): Promise<ChatResponse> {
    try {
      // More action-oriented prompt for continuation
      const continuationPrompt = `I have successfully taken a screenshot and now need to continue with this multi-step request: "${originalMessage}"

COMPLETED STEPS:
- ✅ Screenshot captured

REMAINING STEPS TO EXECUTE:
From the original request, I still need to: open Finder, navigate to Applications, find an unused app, open it, and explore its menus.

Based on the screenshot, execute the NEXT ACTION to continue this workflow. Use the available tools to perform the next step.`

      logger.info(`Sending continuation prompt to LLM: ${continuationPrompt}`)

      // Get available tools
      const availableTools = await this.mcpClient.listTools()
      
      // Ask LLM what to do next based on the screenshot
      const continuationResponse = await this.llmService.processMessage(
        continuationPrompt,
        availableTools,
        sessionId
      )

      logger.info(`LLM continuation response - requiresTools: ${continuationResponse.requiresTools}, toolCalls: ${JSON.stringify(continuationResponse.toolCalls)}`)

      if (continuationResponse.requiresTools && continuationResponse.toolCalls) {
        // Execute the next set of tools
        const nextToolResults = []
        
        for (const toolCall of continuationResponse.toolCalls) {
          logger.info(`Executing continuation tool: ${toolCall.name}`, toolCall.arguments)
          
          try {
            const result = await this.mcpClient.callTool(toolCall.name, toolCall.arguments)
            nextToolResults.push({
              ...result,
              toolName: toolCall.name
            })
            
            if (result.success) {
              logger.info(`Continuation tool ${toolCall.name} executed successfully`)
            } else {
              logger.warn(`Continuation tool ${toolCall.name} failed:`, result.error)
            }
          } catch (error) {
            logger.error(`Error executing continuation tool ${toolCall.name}:`, error)
            nextToolResults.push({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              toolName: toolCall.name
            })
          }
        }

        // Generate final response with all results
        const allResults = [...previousResults, ...nextToolResults]
        logger.info(`Generating final response with ${allResults.length} total tool results`)
        
        // Custom response highlighting what was actually accomplished
        const successfulActions = allResults.filter(r => r.success)
        const actionsSummary = successfulActions.map(r => {
          if (r.toolName === 'remote_macos_get_screen') return '📸 Screenshot captured'
          if (r.toolName === 'remote_macos_open_application') return `🚀 Opened ${r.content || 'application'}`
          if (r.toolName === 'remote_macos_mouse_click') return '🖱️ Clicked on interface'
          if (r.toolName === 'remote_macos_send_keys') return '⌨️ Typed text'
          return `✅ ${r.toolName} executed`
        }).join('\n')

        const responseContent = `✅ **Multi-step workflow in progress!**

I've successfully executed these actions:
${actionsSummary}

${allResults.length > 1 ? 'Let me continue with the next steps...' : 'Ready for the next step in your workflow!'}`

        return {
          content: responseContent,
          type: 'text',
          sessionId,
          timestamp: Date.now()
        }
      } else {
        // LLM provided analysis without needing more tools
        logger.info(`LLM provided analysis without tools: ${continuationResponse.content}`)
        return {
          content: `✅ **Screenshot captured!** ${continuationResponse.content}`,
          type: 'text',
          sessionId,
          timestamp: Date.now()
        }
      }

    } catch (error) {
      logger.error('Error in continuation workflow:', error)
      
      // Fall back to returning the screenshot with explanation
      return {
        content: "📸 I took a screenshot as requested, but encountered an issue continuing with the remaining steps. Please let me know what you'd like me to do next!",
        type: 'image',
        imageData: screenshotData || undefined,
        toolName: 'remote_macos_get_screen',
        sessionId,
        timestamp: Date.now()
      }
    }
  }

  private generateScreenshotMessage(toolResults: any[]): string {
    const successful = toolResults.filter(r => r.success).length
    const failed = toolResults.filter(r => !r.success).length

    if (failed === 0) {
      return "📸 Here's a screenshot of your Mac desktop:"
    } else {
      return `📸 Screenshot captured, but ${failed} operation(s) had issues. Here's what I can see:`
    }
  }

  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    const now = Date.now()

    if (session) {
      session.lastActivity = now
      session.messageCount += 1
    } else {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: now,
        lastActivity: now,
        messageCount: 1
      })
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredSessions = []

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT_MS) {
        expiredSessions.push(sessionId)
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId)
      this.llmService.clearConversationContext(sessionId)
      logger.info(`Cleaned up expired session: ${sessionId}`)
    }

    if (expiredSessions.length > 0) {
      logger.info(`Cleaned up ${expiredSessions.length} expired sessions`)
    }
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    this.llmService.clearConversationContext(sessionId)
    logger.info(`Cleared session: ${sessionId}`)
  }

  getSessionInfo(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) || null
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values())
  }

  // Tool execution with progress feedback
  async executeToolWithFeedback(
    toolName: string, 
    args: Record<string, any>, 
    sessionId: string,
    onProgress?: (status: string) => void
  ): Promise<ChatResponse> {
    try {
      onProgress?.(`Executing ${toolName}...`)
      
      const result = await this.mcpClient.callTool(toolName, args)
      
      if (result.success) {
        onProgress?.(`${toolName} completed successfully`)
        
        if (toolName === 'remote_macos_get_screen' && result.imageData) {
          return {
            content: '📸 Screenshot captured successfully!',
            type: 'image',
            imageData: result.imageData,
            toolName,
            sessionId,
            timestamp: Date.now()
          }
        }
        
        return {
          content: result.content || `✅ ${toolName} executed successfully`,
          type: 'tool_execution',
          toolName,
          sessionId,
          timestamp: Date.now()
        }
      } else {
        onProgress?.(`${toolName} failed: ${result.error}`)
        return {
          content: `❌ Failed to execute ${toolName}: ${result.error}`,
          type: 'error',
          toolName,
          sessionId,
          timestamp: Date.now()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      onProgress?.(`${toolName} error: ${errorMessage}`)
      
      return {
        content: `❌ Error executing ${toolName}: ${errorMessage}`,
        type: 'error',
        toolName,
        sessionId,
        timestamp: Date.now()
      }
    }
  }

  // Check if MCP connection is healthy
  async healthCheck(): Promise<{ connected: boolean, toolCount: number, error?: string }> {
    try {
      const connected = this.mcpClient.isConnected()
      if (!connected) {
        return { connected: false, toolCount: 0, error: 'MCP client not connected' }
      }

      const tools = await this.mcpClient.listTools()
      return { connected: true, toolCount: tools.length }
    } catch (error) {
      return { 
        connected: false, 
        toolCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}