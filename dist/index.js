#!/usr/bin/env node
import { McpServer, } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { findNeovimSockets, getNeovimInstanceDetails, formatNeovimInstances, formatNeovimInstanceDetails, openFileInNeovim, executeInNeovim, } from "./neovim.js";
const server = new McpServer({
    name: "neovim-mcp-server",
    version: "1.0.0",
});
// Register tool to list Neovim instances
server.tool("list-neovim-instances", "List all currently running Neovim instances", async () => {
    try {
        const instances = findNeovimSockets();
        const formattedText = formatNeovimInstances(instances);
        return {
            content: [
                {
                    type: "text",
                    text: formattedText,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error scanning for Neovim instances: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Register tool to get details about a specific Neovim instance
server.tool("get-neovim-instance", "Get detailed information about a specific Neovim instance including working directory, buffers, and cursor position", {
    pid: z.number().describe("Process ID of the Neovim instance"),
}, async (args) => {
    const { pid } = args;
    try {
        const details = await getNeovimInstanceDetails(pid);
        const formattedDetails = formatNeovimInstanceDetails(details);
        return {
            content: [
                {
                    type: "text",
                    text: formattedDetails,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Neovim instance details: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            ],
        };
    }
});
// Register tool to open files in Neovim with optional jump and select
server.tool("neovim-open-file", "Open/switch to a file in Neovim, optionally jump to line/column and select a region", {
    pid: z.number().describe("Process ID of the Neovim instance"),
    filePath: z.string().describe("Path to the file to open"),
    line: z.number().optional().describe("Line number to jump to (1-based)"),
    column: z.number().optional().describe("Column number to jump to (1-based)"),
    endLine: z.number().optional().describe("End line for selection (1-based)"),
    endColumn: z.number().optional().describe("End column for selection (1-based, 999 means end of line)"),
}, async (args) => {
    const { pid, filePath, line, column, endLine, endColumn } = args;
    try {
        const result = await openFileInNeovim(pid, filePath, line, column, endLine, endColumn);
        if (result.success) {
            return {
                content: [
                    {
                        type: "text",
                        text: result.message,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${result.error || result.message}`,
                    },
                ],
            };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error opening file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            ],
        };
    }
});
// Register tool to execute Vim commands or key sequences in Neovim
server.tool("neovim-execute", "Execute a Vim command or key sequence in Neovim (replaces nvmctl exec)", {
    pid: z.number().describe("Process ID of the Neovim instance"),
    command: z.string().describe("Vim command (like ':w', 'set number') or key sequence (like 'gg=G')"),
    isKeySequence: z.boolean().optional().describe("True for key sequences (normal mode keys), false for commands (default: false)"),
}, async (args) => {
    const { pid, command, isKeySequence = false } = args;
    try {
        const result = await executeInNeovim(pid, command, isKeySequence);
        if (result.success) {
            return {
                content: [
                    {
                        type: "text",
                        text: result.message,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${result.error || result.message}`,
                    },
                ],
            };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            ],
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
