import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { attach } from "neovim";

export interface NeovimInstance {
  socket: string;
  pid: number;
}

export interface NeovimInstanceDetails {
  instance: NeovimInstance;
  workingDirectory?: string;
  currentFile?: string;
  buffers?: Array<{
    id: number;
    name: string;
    loaded: boolean;
    current: boolean;
  }>;
  cursorPosition?: {
    line: number;
    column: number;
  };
  error?: string;
}

export interface NeovimOpenFileResult {
  success: boolean;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  error?: string;
}

export interface NeovimExecuteResult {
  success: boolean;
  message: string;
  command?: string;
  output?: string;
  error?: string;
}

/**
 * Finds all currently running Neovim instances by scanning for socket files
 * in the /tmp directory.
 */
export function findNeovimSockets(): NeovimInstance[] {
  const tmpDir = "/tmp";
  const sockets: NeovimInstance[] = [];

  if (!existsSync(tmpDir)) {
    return sockets;
  }

  try {
    const files = readdirSync(tmpDir);

    for (const file of files) {
      if (file.startsWith("nvim-") && file.endsWith(".sock")) {
        const fullPath = join(tmpDir, file);
        try {
          const stats = statSync(fullPath);
          if (stats.isSocket()) {
            const pidMatch = file.match(/nvim-(\d+)\.sock/);
            if (pidMatch) {
              sockets.push({
                socket: fullPath,
                pid: parseInt(pidMatch[1], 10),
              });
            }
          }
        } catch (err) {
          // Skip sockets we can't read
          continue;
        }
      }
    }
  } catch (err) {
    // Return empty array if we can't read /tmp
  }

  return sockets;
}

/**
 * Gets basic information about a specific Neovim instance (socket and PID only).
 */
export function getNeovimInstance(pid: number): NeovimInstance | null {
  const sockets = findNeovimSockets();
  return sockets.find((socket) => socket.pid === pid) || null;
}

/**
 * Gets rich detailed information about a specific Neovim instance via RPC.
 * Includes working directory, buffers, current file, cursor position, etc.
 */
export async function getNeovimInstanceDetails(pid: number): Promise<NeovimInstanceDetails> {
  const instance = getNeovimInstance(pid);
  
  if (!instance) {
    return {
      instance: { socket: '', pid },
      error: `Neovim instance with PID ${pid} not found`,
    };
  }

  try {
    // Connect to Neovim via Unix socket
    const nvim = await attach({ socket: instance.socket });

    try {
      // Get working directory
      const workingDirectory = await nvim.call('getcwd');
      
      // Get current buffer and cursor position
      const currentBuffer = await nvim.buffer;
      const currentFile = await currentBuffer.name;
      const [line, column] = await nvim.call('getpos', '.').then((pos: number[]) => [pos[1], pos[2]]);
      
      // Get all buffers
      const allBuffers = await nvim.buffers;
      const buffers = await Promise.all(
        allBuffers.map(async (buffer, index) => {
          const name = await buffer.name;
          const loaded = await buffer.loaded;
          const current = buffer.id === currentBuffer.id;
          
          return {
            id: buffer.id,
            name: name || `[Buffer ${buffer.id}]`,
            loaded,
            current,
          };
        })
      );

      // Close the RPC connection (without quitting Neovim)
      await nvim.close();

      return {
        instance,
        workingDirectory,
        currentFile: currentFile || undefined,
        buffers,
        cursorPosition: {
          line,
          column,
        },
      };
    } catch (rpcError) {
      // Close the RPC connection (without quitting Neovim)
      try {
        await nvim.close();
      } catch (closeError) {
        // Ignore close errors
      }
      throw rpcError;
    }
  } catch (error) {
    return {
      instance,
      error: `Failed to connect to Neovim instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Format Neovim instances for display
 */
export function formatNeovimInstances(instances: NeovimInstance[]): string {
  if (instances.length === 0) {
    return "No Neovim instances found";
  }

  const instanceInfo = instances
    .map(({ socket, pid }) => `PID ${pid}: ${socket}`)
    .join("\n");

  return `Found ${instances.length} Neovim instance(s):\n${instanceInfo}`;
}

/**
 * Format detailed information about a specific Neovim instance
 */
export function formatNeovimInstanceDetails(details: NeovimInstanceDetails): string {
  const { instance, error } = details;
  
  if (error) {
    return `Neovim Instance ${instance.pid}\nSocket: ${instance.socket}\nError: ${error}`;
  }

  let output = `=== Neovim Instance ${instance.pid} ===\n`;
  output += `Socket: ${instance.socket}\n\n`;

  if (details.workingDirectory) {
    output += `Working Directory: ${details.workingDirectory}\n`;
  }

  if (details.currentFile) {
    output += `Current File: ${details.currentFile}\n`;
  }

  if (details.cursorPosition) {
    output += `Cursor Position: Line ${details.cursorPosition.line}, Column ${details.cursorPosition.column}\n`;
  }

  if (details.buffers && details.buffers.length > 0) {
    output += `\n=== Open Buffers (${details.buffers.length}) ===\n`;
    
    details.buffers.forEach((buffer) => {
      const current = buffer.current ? ' [CURRENT]' : '';
      const loaded = buffer.loaded ? '' : ' (not loaded)';
      const displayName = buffer.name.replace(process.cwd(), '.') || `[Buffer ${buffer.id}]`;
      
      output += `${buffer.id.toString().padStart(3)}: ${displayName}${loaded}${current}\n`;
    });
  }

  return output;
}

/**
 * Opens a file in Neovim, optionally jumping to a position and selecting a region
 */
export async function openFileInNeovim(
  pid: number,
  filePath: string,
  line?: number,
  column?: number,
  endLine?: number,
  endColumn?: number
): Promise<NeovimOpenFileResult> {
  const instance = getNeovimInstance(pid);
  
  if (!instance) {
    return {
      success: false,
      message: `Neovim instance with PID ${pid} not found`,
      error: `PID ${pid} not found`,
    };
  }

  try {
    // Connect to Neovim via Unix socket
    const nvim = await attach({ socket: instance.socket });

    try {
      // Open/switch to the file
      await nvim.command(`edit ${filePath}`);
      
      // Force reload from disk (like nvmctl does)
      await nvim.command('checktime');
      
      let resultMessage = `Opened ${filePath}`;
      
      // Jump to position if specified
      if (line !== undefined) {
        const col = column || 1;
        await nvim.call('cursor', [line, col]);
        resultMessage += ` at line ${line}, column ${col}`;
        
        // Select region if end position specified
        if (endLine !== undefined) {
          const endCol = endColumn || 999; // 999 means end of line like nvmctl
          
          // Enter visual mode and select the region
          await nvim.input('v'); // Enter visual mode
          await nvim.call('cursor', [endLine, endCol]);
          
          resultMessage += ` (selected to line ${endLine}, column ${endCol})`;
        }
      }

      // Close the RPC connection
      await nvim.close();

      return {
        success: true,
        message: resultMessage,
        file: filePath,
        line,
        column,
      };
    } catch (rpcError) {
      // Close the RPC connection
      try {
        await nvim.close();
      } catch (closeError) {
        // Ignore close errors
      }
      throw rpcError;
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to open file in Neovim`,
      file: filePath,
      error: `Failed to connect to Neovim instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Executes a Vim command or key sequence in Neovim
 */
export async function executeInNeovim(
  pid: number,
  command: string,
  isKeySequence: boolean = false
): Promise<NeovimExecuteResult> {
  const instance = getNeovimInstance(pid);
  
  if (!instance) {
    return {
      success: false,
      message: `Neovim instance with PID ${pid} not found`,
      command,
      error: `PID ${pid} not found`,
    };
  }

  try {
    // Connect to Neovim via Unix socket
    const nvim = await attach({ socket: instance.socket });

    try {
      let output = '';
      let resultMessage = '';
      
      if (isKeySequence) {
        // Execute as key sequence (normal mode keys like gg=G)
        await nvim.input(command);
        resultMessage = `Executed key sequence: ${command}`;
      } else {
        // Execute as Vim command (like :w, :set number, etc.)
        if (command.startsWith(':')) {
          // Remove leading colon for command execution
          const cleanCommand = command.substring(1);
          try {
            const result = await nvim.command(cleanCommand);
            // Some commands return output, others don't
            output = result ? String(result) : '';
          } catch (cmdError) {
            // Some commands might fail but still be valid (like failed searches)
            output = cmdError instanceof Error ? cmdError.message : 'Command executed (may have failed)';
          }
        } else {
          // Execute as raw command without colon
          try {
            const result = await nvim.command(command);
            output = result ? String(result) : '';
          } catch (cmdError) {
            output = cmdError instanceof Error ? cmdError.message : 'Command executed (may have failed)';
          }
        }
        
        resultMessage = `Executed command: ${command}`;
        if (output && output.trim()) {
          resultMessage += ` → ${output.trim()}`;
        }
      }

      // Close the RPC connection
      await nvim.close();

      return {
        success: true,
        message: resultMessage,
        command,
        output: output || undefined,
      };
    } catch (rpcError) {
      // Close the RPC connection
      try {
        await nvim.close();
      } catch (closeError) {
        // Ignore close errors
      }
      throw rpcError;
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to execute command in Neovim`,
      command,
      error: `Failed to connect to Neovim instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
