# nvim-mcp Project Rules

## Project Overview
This is a **Model Context Protocol (MCP) server** that provides comprehensive Neovim integration functionality. It enables AI assistants and other MCP clients to interact with running Neovim instances through a modern, programmatic API.

## Purpose
- **Neovim Control**: Provide complete control over Neovim instances via MCP tools
- **AI Integration**: Enable seamless Neovim interaction from AI assistants
- **Rich Data Access**: Expose Neovim state (buffers, cursor position, working directories, etc.)
- **Modern Architecture**: Use MCP protocol for better integration with AI workflows

## Development Approach
- **Production-ready**: Building a robust Neovim MCP integration
- **Use TOOLS, not resources**: All functionality should be implemented as tools, not resources
- **Direct Neovim communication**: Use Neovim's RPC API through Unix sockets for rich data
- **TypeScript**: For better development experience, type safety, and maintainability
- **Separation of concerns**: Keep MCP registration separate from business logic

## Development Notes
- **When working on this project**: Use the **Neovim Dev Integration** rule for seamless editing and navigation

## MCP Implementation Guidelines

### Tools vs Resources
- **Always use tools**: All functionality should be implemented using `server.tool()` method
- **Avoid resources**: Resources are for static data access - tools are better for interactive functionality
- **Benefits of tools**: Better parameter validation, cleaner API, easier testing, more function-like interface

### Tool Implementation Pattern
```typescript
// For tools with no parameters:
server.tool(
  "tool-name",
  "Description of what the tool does",
  async () => {
    // Implementation
    return {
      content: [{
        type: "text",
        text: "Result text"
      }]
    };
  }
);

// For tools with parameters:
server.tool(
  "tool-name",
  "Description of what the tool does",
  {
    param1: z.string().describe("Description of parameter 1"),
    param2: z.number().describe("Description of parameter 2")
  },
  async (args) => {
    const { param1, param2 } = args; // Properly typed
    // Implementation
    return {
      content: [{
        type: "text",
        text: `Result using ${param1} and ${param2}`
      }]
    };
  }
);
```

### Key Implementation Notes
- Use Zod schemas for parameter validation: `z.string()`, `z.number()`, etc.
- Always include descriptive text with `.describe()`
- Parameters are automatically typed when using Zod schemas
- Return format should be `{ content: [{ type: "text", text: string }] }`

## Project Structure
- **`src/index.ts`**: MCP server setup and tool registration
- **`src/neovim.ts`**: Neovim business logic and RPC communication
- **TypeScript compilation**: `npm run build` compiles to `dist/`
- **Development mode**: `npm run dev` for testing

## Development Workflow
- Server communicates via stdio (standard input/output)
- Test with MCP-compatible clients (like Warp AI)
- Use **Neovim Dev Integration** rule for seamless development experience

## Architecture Notes
- **Tools over Resources**: All functionality implemented as MCP tools for better interactivity
- **RPC Communication**: Direct connection to Neovim instances via Unix sockets
- **Error Handling**: Graceful connection management without disrupting running Neovim instances
- **Type Safety**: Full TypeScript interfaces for all data structures

## Notes
- Focus on production-ready code quality and robust error handling
- Leverage Neovim's built-in RPC API for rich, real-time data
- Designed for seamless integration with AI assistants and other MCP clients
