import dotenv from 'dotenv'

dotenv.config()

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  llm: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    defaultProvider: 'openrouter'
  },
  mcp: {
    host: process.env.MACOS_HOST || 'localhost',
    port: parseInt(process.env.MACOS_PORT || '5900', 10),
    username: process.env.MACOS_USERNAME || '',
    password: process.env.MACOS_PASSWORD || '',
    encryption: process.env.VNC_ENCRYPTION || 'prefer_on'
  },
  livekit: {
    url: process.env.LIVEKIT_URL,
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET
  }
}

// Validate required environment variables
if (!config.mcp.password) {
  console.warn('Warning: MACOS_PASSWORD not set. MCP functionality may not work.')
}

if (!config.llm.openaiApiKey && !config.llm.anthropicApiKey && !config.llm.openrouterApiKey) {
  console.warn('Warning: No LLM API keys configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or OPENROUTER_API_KEY.')
} 