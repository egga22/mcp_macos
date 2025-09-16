import { EventEmitter } from 'events'
import type { ChildProcess } from 'child_process'
import { MCPClient } from '../mcpClient'
import type { MCPTool } from '../../types/mcp'
import { spawn } from 'child_process'

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}))

describe('MCPClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('performs initialization handshake and loads tools from the MCP server', async () => {
    jest.useFakeTimers()

    const mockStdout = new EventEmitter()
    const mockStderr = new EventEmitter()

    const writtenMessages: any[] = []

    const mockStdin = {
      writable: true,
      write: jest.fn((chunk: Buffer | string) => {
        const text = chunk.toString()
        text.split('\n').filter(Boolean).forEach((line) => {
          const message = JSON.parse(line)
          writtenMessages.push(message)

          if (message.method === 'initialize' && message.id) {
            mockStdout.emit('data', Buffer.from(JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              result: {
                capabilities: {},
                serverInfo: { name: 'test-server', version: '1.0.0' },
                instructions: null,
              },
            }) + '\n'))
          } else if (message.method === 'tools/list' && message.id) {
            const serverTools: MCPTool[] = [
              {
                name: 'remote_macos_get_screen',
                description: 'Server provided tool',
                inputSchema: { type: 'object', properties: {}, required: [] },
              },
            ]

            mockStdout.emit('data', Buffer.from(JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              result: {
                tools: serverTools,
              },
            }) + '\n'))
          } else if (message.method === 'tools/call' && message.id) {
            mockStdout.emit('data', Buffer.from(JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              result: {
                content: [
                  { type: 'text', text: 'Tool executed successfully' },
                ],
              },
            }) + '\n'))
          }
        })
        return true
      }),
    }

    const mockProcess = Object.assign(new EventEmitter(), {
      stdout: mockStdout,
      stderr: mockStderr,
      stdin: mockStdin,
      kill: jest.fn(),
      on: (event: string, listener: (...args: any[]) => void) => {
        mockProcess.addListener(event, listener)
        return mockProcess
      },
    }) as unknown as ChildProcess

    const spawnMock = spawn as unknown as jest.Mock
    spawnMock.mockReturnValue(mockProcess)

    const client = new MCPClient()
    const connectPromise = client.connect()

    await jest.advanceTimersByTimeAsync(3000)
    await connectPromise

    expect(client.isConnected()).toBe(true)

    expect(writtenMessages.some((msg) => msg.method === 'initialize')).toBe(true)
    expect(writtenMessages.some((msg) => msg.method === 'notifications/initialized')).toBe(true)
    expect(writtenMessages.some((msg) => msg.method === 'tools/list')).toBe(true)

    const tools = await client.listTools()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('remote_macos_get_screen')
    expect(tools[0].description).toBe('Server provided tool')

    const callResult = await client.callTool('remote_macos_get_screen', {})
    expect(callResult.success).toBe(true)
    expect(callResult.content).toBe('Tool executed successfully')

    client.disconnect()
  })
})
