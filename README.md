# nvim-mcp

A **Model Context Protocol (MCP) server** that provides comprehensive Neovim integration for AI assistants. This modern replacement for shell-based Neovim control tools enables seamless interaction between AI assistants and running Neovim instances through the MCP protocol.

## Features

- 🔍 **Instance Discovery**: Find and list all running Neovim instances
- 📊 **Rich Instance Details**: Get working directory, buffers, cursor position, and more
- 📁 **File Navigation**: Open files with precise jump-to-line and text selection capabilities
- ⚡ **Command Execution**: Execute any Vim command or key sequence remotely
- 🔗 **Socket-based**: Direct RPC communication with Neovim via Unix sockets
- 🛡️ **Safe Operations**: Graceful connection management without disrupting your workflow

## Quick Start with Warp AI

### 1. Configure Neovim for Socket Communication

First, ensure Neovim creates Unix sockets for RPC communication. Add this to your Neovim configuration:

**For `init.lua`:**
```lua
-- Enable RPC server on startup
vim.fn.serverstart('/tmp/nvim-' .. vim.fn.getpid() .. '.sock')
```

**For `init.vim`:**
```vim
" Enable RPC server on startup
call serverstart('/tmp/nvim-' . getpid() . '.sock')
```

**Alternative (simpler but less specific):**
```lua
vim.fn.serverstart() -- Uses default socket location
```

> **Note**: This configuration creates a socket file at `/tmp/nvim-<pid>.sock` that the MCP server uses to communicate with your Neovim instance.

### 2. Install and Build

```bash
# Clone or download this repository
git clone <your-repo-url> nvim-mcp
cd nvim-mcp

# Install dependencies
npm install

# Build for production
npm run build
```

### 3. Configure MCP Server in Warp

Add the following to your Warp MCP server configuration:

```json
{
  "mcpServers": {
    "nvim-mcp": {
      "command": "node",
      "args": ["/path/to/nvim-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

**For development (auto-recompiles):**

```json
{
  "mcpServers": {
    "nvim-mcp-dev": {
      "command": "npm",
      "args": ["run", "dev"],
      "env": {},
      "working_directory": "/path/to/nvim-mcp"
    }
  }
}
```

### 4. Set Up Neovim Integration Rule

For the best AI-assisted development experience, add the **Neovim Integration Rule** to your Warp AI rules:

1. **Copy the sample rule**: Use [`SAMPLE_NEOVIM_RULE.md`](SAMPLE_NEOVIM_RULE.md) as a template
2. **Add as Global Rule**: In Warp, go to `Settings > AI > Knowledge > Manage Rules` and add as a Global Rule
3. **Or add to Project Rules**: Copy the content to your project's `WARP.md` file

### 5. Enable MCP in Project Rules

Add this to your project's `WARP.md` file to ensure the AI uses the MCP integration:

```markdown
## Neovim Integration
- **Use nvim-mcp tools**: When working with Neovim, use the MCP tools for file navigation and editing
- **Reference the Neovim Integration rule**: Apply the Neovim Dev Integration workflow for seamless development
```

### 6. Start Using
### 5. Start Using

1. **Start Neovim** in your project (it will create a socket at `/tmp/nvim-<pid>.sock`)
2. **Restart the MCP server** in Warp to pick up the configuration
3. **Test the integration**: Ask Warp AI to "open the main file" or "show me the current buffer"

The AI will now seamlessly:

- Discover your Neovim instances
- Navigate to files and specific lines
- Execute Vim commands
- Get rich context about your current editing session

## Available MCP Tools

### `list-neovim-instances`

Lists all running Neovim instances with PIDs and socket paths.

```json
{}
```

### `get-neovim-instance`

Get detailed information about a specific instance including working directory, open buffers, current file, and cursor position.

```json
{ "pid": 1257 }
```

### `neovim-open-file`

Open/switch to a file with optional jump to line/column and text selection.

```json
{
  "pid": 1257,
  "filePath": "src/index.ts",
  "line": 42,
  "column": 1,
  "endLine": 50,
  "endColumn": 999
}
```

### `neovim-execute`

Execute any Vim command or key sequence.

```json
{
  "pid": 1257,
  "command": ":w",
  "isKeySequence": false
}
```

```json
{
  "pid": 1257,
  "command": "gg=G",
  "isKeySequence": true
}
```

## Development

```bash
# Development mode (auto-recompile)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## Requirements

- **Node.js** 18+
- **TypeScript** (included in dev dependencies)
- **Neovim** configured to create Unix domain sockets (usually automatic)
- **Warp AI** with MCP support

## Architecture

- **`src/index.ts`**: MCP server setup and tool registration
- **`src/neovim.ts`**: Neovim business logic and RPC communication
- **`dist/`**: Compiled JavaScript for production
- **TypeScript**: Full type safety with comprehensive interfaces

## Contributing

This project focuses on production-ready code quality and robust error handling. All functionality is implemented as MCP tools (not resources) for better interactivity with AI assistants.

When working on this project, use the Neovim Dev Integration rule for the best development experience!

---

**Built with ❤️ for seamless AI-assisted Neovim workflows**
