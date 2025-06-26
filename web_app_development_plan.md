# AI macOS Control Web App - Development Plan

## 🎯 Project Overview

**Goal**: Build a web-based AI chatbot that can control macOS through the existing MCP server
**Target**: Proof of Concept → Production Ready App
**Timeline**: 2-3 weeks for MVP, 4-6 weeks for production version

## 🏗️ Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│     Frontend        │────▶│      Backend        │────▶│    MCP Server       │
│   (React/Next.js)   │     │   (Node.js/Express) │     │     (Python)        │
│                     │     │                     │     │                     │
│ • Chat Interface    │     │ • WebSocket Server  │     │ • macOS Control     │
│ • Real-time Updates │     │ • LLM Integration   │     │ • VNC Client        │
│ • Image Display     │     │ • MCP Client        │     │ • Action Handlers   │
│ • Loading States    │     │ • Session Management│     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
         │                           │                           │
    WebSocket/HTTP              LLM APIs                   Local macOS
```

## 📚 Technology Stack

### Frontend
- **Framework**: Next.js 14 (React + TypeScript)
- **Styling**: Tailwind CSS + Headless UI
- **Real-time**: Socket.IO Client
- **State Management**: Zustand (lightweight)
- **HTTP Client**: Axios
- **UI Components**: Custom chat components

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **MCP Client**: Custom implementation
- **LLM Integration**: OpenAI SDK / Anthropic SDK
- **Process Management**: PM2 (production)

### DevOps & Tools
- **Package Manager**: npm/yarn
- **Development**: Nodemon, Concurrently
- **Testing**: Jest, Cypress
- **Linting**: ESLint, Prettier
- **Version Control**: Git

## 📁 Project Structure

```
macos-ai-chat/
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
│
├── frontend/                 # Next.js Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── InputArea.tsx
│   │   │   │   └── TypingIndicator.tsx
│   │   │   ├── UI/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Loading.tsx
│   │   │   │   └── Modal.tsx
│   │   │   └── Layout/
│   │   │       ├── Header.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   ├── useChat.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── stores/
│   │   │   ├── chatStore.ts
│   │   │   └── settingsStore.ts
│   │   ├── types/
│   │   │   ├── chat.ts
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   └── constants.ts
│   │   └── pages/
│   │       ├── index.tsx
│   │       ├── settings.tsx
│   │       └── api/
│   └── public/
│       ├── favicon.ico
│       └── images/
│
├── backend/                  # Express.js Backend
│   ├── src/
│   │   ├── server.ts
│   │   ├── config/
│   │   │   ├── environment.ts
│   │   │   └── socket.ts
│   │   ├── services/
│   │   │   ├── mcpClient.ts
│   │   │   ├── llmService.ts
│   │   │   ├── chatService.ts
│   │   │   └── sessionService.ts
│   │   ├── controllers/
│   │   │   ├── chatController.ts
│   │   │   └── healthController.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   ├── validation.ts
│   │   │   └── rateLimit.ts
│   │   ├── routes/
│   │   │   ├── chat.ts
│   │   │   └── health.ts
│   │   ├── types/
│   │   │   ├── mcp.ts
│   │   │   ├── llm.ts
│   │   │   └── chat.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── helpers.ts
│   └── package.json
│
├── docker/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── TESTING.md
│
└── scripts/
    ├── dev.sh
    ├── build.sh
    └── deploy.sh
```

## 🚀 Development Phases

### Phase 1: Foundation (Week 1)
**Duration**: 3-4 days
**Goal**: Basic working prototype

#### 1.1 Project Setup (Day 1)
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Express.js backend
- [ ] Configure Tailwind CSS
- [ ] Set up basic project structure
- [ ] Install and configure dependencies

#### 1.2 Basic Chat Interface (Day 2)
- [ ] Create basic chat layout
- [ ] Implement message bubbles (user/assistant)
- [ ] Add input area with send functionality
- [ ] Set up WebSocket connection (frontend)
- [ ] Basic styling and responsive design

#### 1.3 Backend Foundation (Day 3)
- [ ] Set up Express server with Socket.IO
- [ ] Create basic WebSocket handlers
- [ ] Implement health check endpoint
- [ ] Set up environment configuration
- [ ] Add basic logging

#### 1.4 MCP Integration (Day 4)
- [ ] Create MCP client service
- [ ] Implement basic tool calling
- [ ] Test screenshot functionality
- [ ] Add error handling
- [ ] Connect frontend to backend

### Phase 2: Core Features (Week 2)
**Duration**: 5-6 days
**Goal**: Full AI integration with macOS control

#### 2.1 LLM Integration (Days 1-2)
- [ ] Set up OpenAI/Anthropic API client
- [ ] Implement function calling workflow
- [ ] Create tool schema conversion (MCP → LLM format)
- [ ] Add conversation context management
- [ ] Implement streaming responses

#### 2.2 Advanced Chat Features (Days 3-4)
- [ ] Add typing indicators
- [ ] Implement message history persistence
- [ ] Add image display for screenshots
- [ ] Create loading states for tool execution
- [ ] Add message timestamps and status

#### 2.3 macOS Control Integration (Days 5-6)
- [ ] Integrate all MCP tools:
  - [ ] Screenshot capture
  - [ ] Mouse click/move/scroll
  - [ ] Keyboard input
  - [ ] Application launching
  - [ ] Drag and drop
- [ ] Add tool execution feedback
- [ ] Implement coordinate scaling
- [ ] Add safety confirmations for destructive actions

### Phase 3: Polish & Production (Week 3)
**Duration**: 5-7 days
**Goal**: Production-ready application

#### 3.1 User Experience (Days 1-2)
- [ ] Improve UI/UX design
- [ ] Add dark/light theme
- [ ] Implement settings panel
- [ ] Add keyboard shortcuts
- [ ] Mobile-responsive design

#### 3.2 Error Handling & Validation (Days 3-4)
- [ ] Comprehensive error handling
- [ ] Input validation and sanitization
- [ ] Rate limiting and spam protection
- [ ] Connection retry logic
- [ ] Graceful degradation

#### 3.3 Testing & Deployment (Days 5-7)
- [ ] Unit tests for critical functions
- [ ] Integration tests for MCP communication
- [ ] E2E tests for chat workflow
- [ ] Performance optimization
- [ ] Docker containerization
- [ ] Deployment scripts

## 🔧 Key Implementation Details

### WebSocket Event Schema
```typescript
// Client → Server
interface ClientEvents {
  'chat_message': {
    message: string;
    sessionId: string;
  };
  'join_session': {
    sessionId: string;
  };
}

// Server → Client
interface ServerEvents {
  'chat_response': {
    message: string;
    type: 'text' | 'image' | 'error';
    timestamp: number;
  };
  'typing_start': {};
  'typing_stop': {};
  'tool_execution_start': {
    toolName: string;
  };
  'tool_execution_complete': {
    toolName: string;
    success: boolean;
  };
}
```

### MCP Tool Integration
```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
```

### LLM Integration Flow
```typescript
// 1. User sends message
// 2. Check if message requires tools
// 3. Call LLM with available tools
// 4. Execute tool calls via MCP
// 5. Send results back to LLM
// 6. Return final response to user
```

## 🧪 Testing Strategy

### Unit Tests
- MCP client functions
- LLM service integration
- Chat message processing
- Tool result parsing

### Integration Tests
- WebSocket communication
- MCP server connectivity
- End-to-end tool execution
- Error handling flows

### E2E Tests
- Complete chat workflow
- Screenshot capture and display
- Mouse/keyboard control
- Application launching

## 📊 Success Metrics

### Phase 1 Success Criteria
- [ ] Chat interface loads and displays messages
- [ ] WebSocket connection established
- [ ] Basic screenshot tool works
- [ ] No critical errors in console

### Phase 2 Success Criteria
- [ ] All MCP tools integrated and working
- [ ] LLM responds with appropriate tool calls
- [ ] Real-time updates work smoothly
- [ ] Error states handled gracefully

### Phase 3 Success Criteria
- [ ] App works reliably for 30+ minutes
- [ ] Responsive design on different screen sizes
- [ ] Performance under normal usage loads
- [ ] Ready for user testing

## 🚀 Development Commands

```bash
# Development
npm run dev          # Start both frontend and backend
npm run dev:frontend # Start only frontend
npm run dev:backend  # Start only backend

# Building
npm run build        # Build both frontend and backend
npm run build:frontend
npm run build:backend

# Testing
npm run test         # Run all tests
npm run test:unit    # Unit tests only
npm run test:e2e     # E2E tests only

# Deployment
npm run deploy:staging
npm run deploy:production
```

## 📋 Environment Variables

```bash
# Backend Environment
NODE_ENV=development
PORT=3001
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# MCP Server Configuration  
MACOS_HOST=localhost
MACOS_PASSWORD=your_vnc_password
MACOS_USERNAME=your_username
MACOS_PORT=5900

# Optional: LiveKit for WebRTC
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

## 🎯 Next Steps

1. **Confirm tech stack choices**
2. **Set up development environment**
3. **Begin Phase 1 implementation**
4. **Regular progress reviews**
5. **User testing and feedback**

This plan provides a structured approach to building your AI macOS control web app. Each phase builds upon the previous one, ensuring steady progress toward a production-ready application.

Would you like me to start implementing any specific part of this plan? 