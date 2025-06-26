# AI Prompts for Web App Development - Phase 2 & 3

## 🚀 Phase 2 Prompt: Core Features Implementation

### Context
You are working on a web-based AI chatbot that controls macOS through an existing MCP (Model Context Protocol) server. Phase 1 has been completed and includes:
- Basic Next.js frontend with chat interface
- Node.js backend with Express and Socket.IO
- Basic MCP client integration
- WebSocket real-time communication
- Foundation components and services

### Your Mission - Phase 2: Core Features (5-6 days)
**Goal**: Implement full AI integration with comprehensive macOS control capabilities

### Specific Tasks to Complete:

#### 2.1 LLM Integration (Priority: HIGH)
**Objective**: Integrate OpenAI/OpenRouter API with function calling for natural language to macOS control

**Tasks**:
1. **Update LLM Service** (`backend/src/services/llmService.ts`):
   - Configure OpenRouter API integration (user has key: ``)
   - Implement function calling workflow with proper tool schema conversion
   - Add conversation context management (maintain chat history)
   - Implement streaming responses for better UX
   - Add retry logic and error handling for API calls

2. **Tool Schema Conversion**:
   - Convert MCP tool schemas to OpenAI function calling format
   - Ensure all available MCP tools are properly exposed to the LLM
   - Implement dynamic tool discovery from MCP server

3. **Conversation Flow**:
   - Implement multi-turn conversations with context
   - Handle tool execution results and follow-up questions
   - Add system prompts for macOS control assistance

#### 2.2 Advanced Chat Features (Priority: MEDIUM)
**Objective**: Enhance the chat interface with professional features

**Tasks**:
1. **Enhanced UI Components**:
   - Add typing indicators when AI is processing
   - Implement message history persistence (localStorage/sessionStorage)
   - Add proper loading states for tool execution
   - Display screenshots and images inline in chat
   - Add message timestamps and delivery status

2. **Real-time Features**:
   - Implement proper WebSocket event handling
   - Add connection status indicators
   - Handle reconnection logic gracefully
   - Show tool execution progress in real-time

#### 2.3 Complete macOS Control Integration (Priority: HIGH)
**Objective**: Integrate all available MCP tools for comprehensive macOS control

**Tasks**:
1. **Implement All MCP Tools**:
   - Screenshot capture with inline display
   - Mouse actions (click, move, scroll, drag-and-drop)
   - Keyboard input and text typing
   - Application launching and window management
   - File system operations (if available)

2. **Enhanced Tool Execution**:
   - Add coordinate scaling for different screen resolutions
   - Implement safety confirmations for destructive actions
   - Add tool execution feedback and status updates
   - Handle tool errors gracefully with user-friendly messages

3. **Image Handling**:
   - Display screenshots directly in the chat interface
   - Add image zoom/fullscreen capabilities
   - Implement proper image loading states

### Technical Requirements:
- Use TypeScript throughout
- Maintain existing code architecture
- Add comprehensive error handling
- Ensure type safety for all new features
- Follow existing naming conventions
- Add appropriate logging for debugging

### Success Criteria:
- [ ] LLM integration works with natural language commands
- [ ] All MCP tools are accessible through chat
- [ ] Screenshots display properly in the interface
- [ ] Tool execution provides real-time feedback
- [ ] Error handling works for all edge cases
- [ ] Conversation context is maintained across interactions

### Files to Focus On:
- `backend/src/services/llmService.ts` (OpenRouter integration)
- `backend/src/services/chatService.ts` (conversation orchestration)
- `backend/src/services/mcpClient.ts` (tool integration)
- `frontend/src/components/Chat/MessageBubble.tsx` (image display)
- `frontend/src/components/Chat/TypingIndicator.tsx` (loading states)

---

## 🎨 Phase 3 Prompt: Polish & Production Ready

### Context
You have completed Phase 2 with working LLM integration and full macOS control. The application now needs polish, optimization, and production-readiness. The core functionality works but needs refinement for real-world usage.

### Your Mission - Phase 3: Polish & Production (5-7 days)
**Goal**: Transform the working prototype into a production-ready application

### Specific Tasks to Complete:

#### 3.1 User Experience Enhancement (Priority: HIGH)
**Objective**: Create a professional, polished user interface with excellent UX

**Tasks**:
1. **UI/UX Improvements**:
   - Implement dark/light theme toggle with system preference detection
   - Enhance the chat interface with better spacing, typography, and visual hierarchy
   - Add smooth animations and transitions (loading states, message appearance)
   - Improve responsive design for different screen sizes (desktop, tablet, mobile)
   - Add proper focus management and accessibility features

2. **Settings & Configuration**:
   - Create a settings panel for user preferences
   - Add MCP server connection configuration
   - Implement chat history management (clear, export)
   - Add keyboard shortcuts for common actions
   - User preference persistence

3. **Advanced Features**:
   - Add message search functionality
   - Implement chat session management
   - Add screenshot annotation tools
   - Create command suggestions/autocomplete

#### 3.2 Robustness & Error Handling (Priority: HIGH)
**Objective**: Ensure the application handles all edge cases gracefully

**Tasks**:
1. **Comprehensive Error Handling**:
   - Implement proper error boundaries in React components
   - Add user-friendly error messages for all failure scenarios
   - Handle MCP server disconnections gracefully
   - Implement retry mechanisms for failed operations
   - Add proper validation for all user inputs

2. **Security & Protection**:
   - Implement rate limiting to prevent spam
   - Add input validation and sanitization
   - Implement session management and timeouts
   - Add CORS configuration for production
   - Secure environment variable handling

3. **Connection Management**:
   - Implement automatic reconnection logic
   - Handle WebSocket connection drops gracefully
   - Add connection health monitoring
   - Implement graceful degradation when services are unavailable

#### 3.3 Testing & Production Readiness (Priority: MEDIUM)
**Objective**: Ensure code quality and deployment readiness

**Tasks**:
1. **Testing Implementation**:
   - Add unit tests for critical backend services
   - Create integration tests for MCP communication
   - Implement E2E tests for the complete chat workflow
   - Add performance tests for concurrent users
   - Test error scenarios and edge cases

2. **Performance Optimization**:
   - Optimize WebSocket message handling
   - Implement proper loading states and lazy loading
   - Optimize image handling and caching
   - Add request/response compression
   - Monitor and optimize memory usage

3. **Deployment Preparation**:
   - Create production Docker configurations
   - Add environment-specific configurations
   - Implement health check endpoints
   - Add monitoring and logging infrastructure
   - Create deployment scripts and documentation

### Technical Requirements:
- Maintain backward compatibility with existing code
- Add comprehensive TypeScript types
- Implement proper logging throughout the application
- Follow security best practices
- Optimize for performance and scalability
- Add proper documentation

### Success Criteria:
- [ ] Application works reliably for extended periods (30+ minutes)
- [ ] Responsive design works on all target devices
- [ ] All error scenarios are handled gracefully
- [ ] Performance is acceptable under normal usage
- [ ] Ready for user testing and feedback
- [ ] Production deployment is possible

### Files to Focus On:
- `frontend/src/app/globals.css` (theming and styling)
- `frontend/src/components/` (all UI components)
- `backend/src/middleware/` (error handling, validation)
- `frontend/src/hooks/` (connection management)
- `frontend/src/stores/` (state management)
- Create new files for testing and configuration

### Additional Deliverables:
- User documentation/README updates
- API documentation
- Deployment guide
- Testing guide
- Performance benchmarks

---

## 🛠️ Implementation Guidelines for Both Phases

### Code Quality Standards:
- Use TypeScript strict mode
- Implement proper error boundaries
- Add comprehensive logging
- Follow existing code patterns
- Use proper async/await patterns
- Implement proper cleanup in useEffect hooks

### Testing Strategy:
- Unit tests for business logic
- Integration tests for API communication
- E2E tests for user workflows
- Error scenario testing
- Performance testing

### Documentation Requirements:
- Update README.md with setup instructions
- Document all API endpoints
- Add inline code comments for complex logic
- Create user guide for the application
- Document deployment process

### Performance Considerations:
- Optimize WebSocket message frequency
- Implement proper image compression
- Use React.memo and useMemo appropriately
- Minimize re-renders in chat interface
- Implement proper caching strategies

Remember to test thoroughly at each step and maintain the existing project structure and coding patterns established in Phase 1. 