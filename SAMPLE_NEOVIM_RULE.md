# Neovim Integration with Warp AI

## Overview

- Purpose: Seamless, quiet Neovim coordination during development using MCP tools.
- Behavior: When you reference "this file/method/function/class", I silently use MCP tools to identify, open, navigate, and highlight. After making changes, I won't narrate opening/jumping/highlighting unless results matter (e.g., no matches found, ambiguous target).

## Requirements

- Neovim creates a socket at `/tmp/nvim-<pid>.sock` (autostart configured).
- nvim-mcp server running in Warp providing MCP tools for Neovim control

## MCP Tools Available

### Discover available instances and details

- `list-neovim-instances` - Lists all running Neovim instances with PIDs and socket paths
- `get-neovim-instance` - Get rich details about specific instance (working directory, buffers, cursor position)
  - Silent default: When you say "this file/these files", I run it silently to infer the active file(s) and context

### Open, jump, and select

- `neovim-open-file` - Opens/switches to file, jumps to line/col, optionally selects region
  - Parameters: `pid`, `filePath`, `line` (optional), `column` (optional), `endLine` (optional), `endColumn` (optional)
  - Use `999` as `endColumn` to select to end of the line
  - Silent default: After edits, I open the file and jump/select the changed region without commentary
  - Examples:
    - Jump only: `{"pid": 1257, "filePath": "path/to/file.py", "line": 120}`
    - Jump to column: `{"pid": 1257, "filePath": "path/to/file.py", "line": 120, "column": 8}`
    - Select a block: `{"pid": 1257, "filePath": "path/to/file.py", "line": 100, "column": 1, "endLine": 140, "endColumn": 999}`

### Execute commands and key sequences

- `neovim-execute` - Execute any Vim command or key sequence
  - Parameters: `pid`, `command`, `isKeySequence` (optional, defaults to false)
  - Commands: `:w`, `:set number`, `/searchterm`, etc.
  - Key sequences: `gg=G`, `dd`, `yy`, etc. (set `isKeySequence: true`)
  - Silent default: I may use this to navigate, search, or execute operations; I only surface results if important

## Silent Defaults (don't narrate these)

- Discovering current file/buffers with `get-neovim-instance`
- Opening/switching files, jumping to lines/columns, and selecting regions with `neovim-open-file`
- Executing simple navigation/commands via `neovim-execute`
- Getting instance details to understand context

Only ask briefly when:

- No Neovim instances are found or multiple instances exist and selection is unclear
- References are ambiguous and cannot be resolved confidently from active context

## Workflow Preferences

- Keep Neovim open for visual review while I perform edits and navigations programmatically
- When asked to "look at" or "check" a file, I first use `get-neovim-instance` silently to get file context, then read contents via proper file-reading. I only ask if ambiguity remains
- For "where is this function/class/method?":
  - Identify file via `get-neovim-instance` silently
  - Compute start/end lines from code
  - Use `neovim-open-file` with region selection to highlight: `{"pid": <pid>, "filePath": "<file>", "line": <start>, "column": 1, "endLine": <end>, "endColumn": 999}`

## Code Change Workflow (File-based with Auto-reload)

1. Ensure the file is active in Neovim:
   - Use `neovim-open-file` to open and jump: `{"pid": <pid>, "filePath": "path/to/file.py", "line": <line>}`
2. Make changes with the file edit tool
3. Navigate to changes in Neovim:
   - Use `neovim-open-file` to jump to the changed region: `{"pid": <pid>, "filePath": "path/to/file.py", "line": <start_line>, "column": 1, "endLine": <end_line>, "endColumn": 999}`
4. If the project requires a restart after code changes:
   - Check for project-specific restart methods (e.g., `task restart`, `docker-compose restart`, `npm run dev`)
   - Consider file type: Some frameworks (Vue, React) have hot-reload and don't need restarts
   - Backend changes (Python, Ruby, Go, etc.) often require service restart
5. After changes, I will silently open and highlight the relevant change location

## Safety and Performance

- MCP tools automatically connect to appropriate Neovim instances via socket communication
- Operations used here are safe and reversible:
  - Treat as read-only when inspecting (`get-neovim-instance`)
  - Treat as not risky when opening/switching/jumping/selecting/executing simple commands
- MCP tools handle connection management automatically without disrupting running Neovim instances

## Quick Reference Examples

- Show instance details: `{"pid": <pid>}` with `get-neovim-instance`
- Open file and jump to line: `{"pid": <pid>, "filePath": "file.py", "line": 100}` with `neovim-open-file`
- Jump and highlight a class: `{"pid": <pid>, "filePath": "cms/wagtail_hooks.py", "line": 622, "column": 1, "endLine": 684, "endColumn": 999}` with `neovim-open-file`
- Search for a symbol: `{"pid": <pid>, "command": "/sync_worldview"}` with `neovim-execute`
- Save file: `{"pid": <pid>, "command": ":w"}` with `neovim-execute`
- Format file: `{"pid": <pid>, "command": "gg=G", "isKeySequence": true}` with `neovim-execute`
- After edits: Navigate to changes with `neovim-open-file`
