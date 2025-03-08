/**
 * MCP Command Proxy
 * 
 * A Model Context Protocol (MCP) server for proxying CLI commands and collecting logs
 * 
 * @module mcp-command-proxy
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { CommandRunner, ProcessStatus, LogEntry } from './utils/command-runner.js';

/**
 * Create an MCP server for proxying CLI commands
 */
export async function createServer(options: {
  prefix: string;
  command: string;
  bufferSize?: number;
  port: number;
}) {
  const { prefix, command, bufferSize = 300, port } = options;
  
  // Create Express app
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());
  
  // Create MCP server
  const server = new McpServer({
    name: `${prefix} MCP Server`,
    version: '1.0.0'
  });
  
  // Create command runner
  const commandRunner = new CommandRunner({
    command,
    logBufferSize: bufferSize,
  });
  
  // Setup command runner event handlers
  commandRunner.on('log', (entry: LogEntry) => {
    // Log to console for debugging
    if (entry.type === 'stdout') {
      process.stdout.write(entry.content);
    } else if (entry.type === 'stderr') {
      process.stderr.write(entry.content);
    } else {
      console.log(`[${prefix}] ${entry.content}`);
    }
  });
  
  commandRunner.on('exit', (code: number) => {
    console.log(`[${prefix}] Command exited with code ${code}`);
  });
  
  commandRunner.on('error', (error: Error) => {
    console.error(`[${prefix}] Command error:`, error);
  });
  
  // Add MCP tools
  
  // Add a resource for recent logs
  server.resource(
    'logs',
    'logs://recent',
    async () => {
      const logs = commandRunner.getLogs()
        .slice(-100); // Default to 100 most recent logs
      
      return {
        contents: [{
          uri: 'logs://recent',
          text: JSON.stringify(logs, null, 2)
        }]
      };
    }
  );
  
  // Add tool to get recent logs
  server.tool(
    'getRecentLogs',
    {
      limit: z.number().optional().default(100),
      types: z.array(z.enum(['stdout', 'stderr', 'system'])).optional().default(['stdout', 'stderr', 'system'])
    },
    async ({ limit, types }) => {
      const logs = commandRunner.getLogs()
        .filter((log: LogEntry) => types.includes(log.type))
        .slice(-limit);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(logs)
          }
        ]
      };
    }
  );
  
  // Add tool to send key press
  server.tool(
    'sendKeyPress',
    {
      key: z.string()
    },
    async ({ key }) => {
      if (commandRunner.getStatus() !== ProcessStatus.RUNNING) {
        return {
          content: [
            {
              type: 'text',
              text: 'Command is not running'
            }
          ],
          isError: true
        };
      }
      
      // Convert special key names to actual characters if needed
      const keyMap: Record<string, string> = {
        'enter': '\r',
        'return': '\r',
        'space': ' ',
        'tab': '\t',
        'escape': '\x1b',
        'backspace': '\x7f'
      };

      const keyToSend = keyMap[key.toLowerCase()] || key;
      commandRunner.write(keyToSend);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Key sent successfully'
          }
        ]
      };
    }
  );
  
  // Add tool to get process status
  server.tool(
    'getProcessStatus',
    {},
    async () => {
      const status = commandRunner.getStatus();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ status })
          }
        ]
      };
    }
  );
  let transport: SSEServerTransport;
  
  // Set up SSE endpoint
  app.get("/sse", async (req, res) => {
    console.log(`[${prefix}] SSE endpoint connected`);
    if(!transport) {
      transport = new SSEServerTransport("/messages", res);
    }
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    await transport.handlePostMessage(req, res);
    console.log(`[${prefix}] Message received:`, req.body);
  });
    
  // Setup raw mode for stdin
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    console.log(`[${prefix}] Terminal is in TTY mode, listening for keypresses`);
    
    process.stdin.on('data', (data: Buffer | string) => {
      // Convert buffer to string if needed
      const str = Buffer.isBuffer(data) ? data.toString() : data;
      
      console.log(`[${prefix}] Received keypress:`, str.split('').map((c: string) => c.charCodeAt(0)));
      
      // Handle special keys
      if (str === '\u0003') { // Ctrl+C
        console.log(`[${prefix}] Received Ctrl+C, exiting...`);
        process.exit();
      }
      
      // Map some common keys
      const keyMap: Record<string, string> = {
        '\u001b[A': '\x1b[A', // Up arrow
        '\u001b[B': '\x1b[B', // Down arrow
        '\u001b[C': '\x1b[C', // Right arrow
        '\u001b[D': '\x1b[D', // Left arrow
        '\r': '\r\n',         // Enter
      };
      
      // Forward keypress to the child process
      if (commandRunner.getStatus() === ProcessStatus.RUNNING) {
        const mapped = keyMap[str] || str;
        console.log(`[${prefix}] Forwarding keypress to child process:`, mapped.split('').map((c: string) => c.charCodeAt(0)));
        commandRunner.write(mapped);
      }
    });
    
    // Handle process exit
    process.on('exit', () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    });
  } else {
    console.log(`[${prefix}] Terminal is not in TTY mode, keypresses won't be captured`);
  }
  
  // Start the command
  commandRunner.start();
  
  // Start the HTTP server
  const server_instance = app.listen(port, () => {
    console.log(`[${prefix}] MCP server listening on port ${port}`);
    console.log(`[${prefix}] SSE endpoint: http://localhost:${port}/sse`);
    console.log(`[${prefix}] Messages endpoint: http://localhost:${port}/messages`);
    console.log(`[${prefix}] MCP server started with command: ${command}`);
  });
  
  // Return a stop function
  return {
    stop: () => {
      commandRunner.stop();
      server_instance.close();
      console.log(`[${prefix}] MCP server stopped`);
    }
  };
}

// Re-export other utilities
export { CommandRunner, ProcessStatus, type LogEntry } from './utils/command-runner.js';
export { CircularBuffer } from './utils/buffer.js';

// Re-export the CLI for direct execution
export * from './cli.js'; 