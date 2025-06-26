import OpenAI from 'openai'
import { config } from '../config/environment'
import logger from '../utils/logger'
import { MCPTool, MCPToolCall } from '../types/mcp'

export interface LLMResponse {
  content: string
  toolCalls?: MCPToolCall[]
  requiresTools: boolean
  streaming?: boolean
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface LLMStreamChunk {
  content?: string
  done: boolean
  toolCalls?: MCPToolCall[]
}

export class LLMService {
  private openai: OpenAI | null = null
  private conversations: Map<string, ConversationMessage[]> = new Map()
  private readonly MAX_CONTEXT_MESSAGES = 20
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY_MS = 1000

  constructor() {
    // Use OpenRouter if available, fallback to OpenAI
    if (config.llm.openrouterApiKey) {
      this.openai = new OpenAI({
        apiKey: config.llm.openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1'
      })
      logger.info('LLM Service initialized with OpenRouter')
    } else if (config.llm.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.llm.openaiApiKey
      })
      logger.info('LLM Service initialized with OpenAI')
    }
  }

  async processMessage(
    message: string,
    availableTools: MCPTool[],
    sessionId: string = 'default',
    streaming: boolean = false
  ): Promise<LLMResponse> {
    try {
      if (!this.openai) {
        throw new Error('No LLM provider configured')
      }

      // Get conversation context
      const context = this.getConversationContext(sessionId)
      
      // Convert MCP tools to OpenAI tools format
      const tools = this.convertMCPToolsToOpenAIFormat(availableTools)

      // Prepare messages with enhanced system prompt
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.getEnhancedSystemPrompt(availableTools)
        },
        ...context.map(msg => {
          if (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant') {
            return {
              role: msg.role,
              content: msg.content
            }
          }
          return {
            role: 'user' as const,
            content: msg.content
          }
        }),
        {
          role: 'user',
          content: message
        }
      ]

      // Add user message to context
      this.addToConversationContext(sessionId, {
        role: 'user',
        content: message,
        timestamp: Date.now()
      })

      const response = await this.callLLMWithRetry(messages, tools, streaming)
      
      // Add assistant response to context
      this.addToConversationContext(sessionId, {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now()
      })

      return response

    } catch (error) {
      logger.error('Error processing LLM message:', error)
      throw error
    }
  }

  private async callLLMWithRetry(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    streaming: boolean = false
  ): Promise<LLMResponse> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const model = config.llm.openrouterApiKey ? 'openai/gpt-4-turbo-preview' : 'gpt-4-turbo-preview'
        
        const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
          model,
          messages,
          temperature: 0.1,
          max_tokens: 2000,
        }

        // Add tools if available
        if (tools.length > 0) {
          requestParams.tools = tools
          requestParams.tool_choice = 'auto'
        }

        if (streaming && !tools.length) {
          // Use streaming for regular responses (not tool calls)
          return await this.handleStreamingResponse(requestParams)
        }

        const response = await this.openai!.chat.completions.create(requestParams)
        const choice = response.choices[0]
        
        if (!choice.message) {
          throw new Error('No response from LLM')
        }

        // Check for tool calls
        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          const toolCalls: MCPToolCall[] = choice.message.tool_calls.map(call => ({
            name: call.function.name,
            arguments: JSON.parse(call.function.arguments || '{}')
          }))

          return {
            content: choice.message.content || 'Executing tools...',
            toolCalls,
            requiresTools: true
          }
        }

        return {
          content: choice.message.content || 'I\'m not sure how to respond to that.',
          requiresTools: false
        }

      } catch (error) {
        lastError = error as Error
        logger.warn(`LLM call attempt ${attempt} failed:`, error)
        
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * attempt))
        }
      }
    }

    throw lastError || new Error('All LLM retry attempts failed')
  }

  private async handleStreamingResponse(
    requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
  ): Promise<LLMResponse> {
    // Note: This is a placeholder for streaming implementation
    // In a full implementation, this would return an async generator
    // For now, we'll fall back to regular response
    const response = await this.openai!.chat.completions.create(requestParams)
    const choice = response.choices[0]
    
    return {
      content: choice.message?.content || 'I\'m not sure how to respond to that.',
      requiresTools: false,
      streaming: false
    }
  }

  private getEnhancedSystemPrompt(availableTools: MCPTool[]): string {
    return `You are an advanced AI assistant specialized in controlling macOS systems through natural language commands. You have access to powerful tools that allow you to:

🖥️ **Screen Control:**
- Take screenshots to see what's currently displayed
- Analyze UI elements and layout

🖱️ **Mouse & Interaction:**
- Click on specific coordinates or UI elements
- Perform double-clicks, right-clicks
- Drag and drop operations
- Scroll in any direction

⌨️ **Keyboard Control:**
- Type any text or special characters
- Send keyboard shortcuts (cmd+c, cmd+v, etc.)
- Press special keys (enter, tab, esc, etc.)

🚀 **Application Management:**
- Launch and switch between applications
- Open specific applications by name

**Available Tools:** ${availableTools.map(t => `${t.name} - ${t.description}`).join(', ')}

**CRITICAL: You CAN and SHOULD use tools to perform actions on the user's Mac. Do NOT give conversational responses when the user asks you to do something - USE THE TOOLS!**

**Multi-Step Task Handling:**
For complex requests with multiple steps (like "Take a screenshot, then open Finder, navigate to Applications..."):
1. If the request starts with "Take a screenshot" or similar, ONLY call the screenshot tool first
2. For continuation requests, identify the NEXT SPECIFIC ACTION needed and execute it using tools
3. Always use tools when the user requests actions - never give explanatory responses about what they "could" do

**Tool Usage Priority:**
- When asked to "open" something → USE remote_macos_open_application 
- When asked to "click" something → USE remote_macos_mouse_click
- When asked to "type" something → USE remote_macos_send_keys
- When asked to "take screenshot" → USE remote_macos_get_screen

**Best Practices:**
1. Always take a screenshot first if you need to see the current state
2. Be precise with coordinates when clicking
3. USE TOOLS to perform actions, don't just explain what to do
4. After using tools, acknowledge what you actually did
5. For multi-step tasks, execute the immediate next action using available tools

**Interaction Style:**
- EXECUTE actions using tools rather than explaining them
- Be direct about what you accomplished
- Use tools confidently when users request actions
- Only ask for clarification if the request is genuinely unclear

**Important:** When a user requests ANY action that can be performed with available tools, USE THE TOOLS immediately. Do not give instructions or explanations unless tools are not available or fail.

Remember: You're actively controlling the user's Mac. Use the tools to perform the requested actions!`
  }

  private convertMCPToolsToOpenAIFormat(tools: MCPTool[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }))
  }

  private getConversationContext(sessionId: string): ConversationMessage[] {
    return this.conversations.get(sessionId) || []
  }

  private addToConversationContext(sessionId: string, message: ConversationMessage): void {
    const context = this.conversations.get(sessionId) || []
    context.push(message)
    
    // Keep only the most recent messages
    if (context.length > this.MAX_CONTEXT_MESSAGES) {
      context.splice(0, context.length - this.MAX_CONTEXT_MESSAGES)
    }
    
    this.conversations.set(sessionId, context)
  }

  clearConversationContext(sessionId: string): void {
    this.conversations.delete(sessionId)
  }

  async generateFollowUpResponse(
    originalMessage: string,
    toolResults: any[],
    availableTools: MCPTool[],
    sessionId: string = 'default'
  ): Promise<LLMResponse> {
    try {
      if (!this.openai) {
        throw new Error('No LLM provider configured')
      }

      // Create detailed summary of what was accomplished
      const successfulTools = toolResults.filter(r => r.success)
      const failedTools = toolResults.filter(r => !r.success)
      
      let toolSummary = ''
      if (successfulTools.length > 0) {
        toolSummary += `✅ Successfully executed: ${successfulTools.map(r => r.toolName).join(', ')}\n`
      }
      if (failedTools.length > 0) {
        toolSummary += `❌ Failed to execute: ${failedTools.map(r => `${r.toolName} (${r.error})`).join(', ')}\n`
      }

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'You are an AI assistant that just executed tools to help the user. Provide a helpful summary of what was accomplished and offer relevant next steps or ask if the user needs anything else. Be conversational and supportive.'
        },
        {
          role: 'user',
          content: `Original request: "${originalMessage}"

Tool execution results:
${toolSummary}

Please provide a helpful summary and suggest what the user might want to do next.`
        }
      ]

      const model = config.llm.openrouterApiKey ? 'openai/gpt-4-turbo-preview' : 'gpt-4-turbo-preview'

      const response = await this.openai.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 500
      })

      const choice = response.choices[0]
      const content = choice.message?.content || 'Task completed successfully!'
      
      // Add follow-up to context
      this.addToConversationContext(sessionId, {
        role: 'assistant',
        content,
        timestamp: Date.now()
      })
      
      return {
        content,
        requiresTools: false
      }

    } catch (error) {
      logger.error('Error generating follow-up response:', error)
      return {
        content: 'Task completed.',
        requiresTools: false
      }
    }
  }
} 