#!/usr/bin/env node

import { createServer } from './index.js';

// Parse command line arguments
export function parseArgs(): { prefix: string; command: string; bufferSize: number; port: number } {
  const args = process.argv.slice(2);
  let prefix = 'CommandProxy';
  let command = '';
  let bufferSize = 300;
  let port = 8080;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--prefix' || arg === '-p') {
      prefix = args[++i] || prefix;
    } else if (arg === '--command' || arg === '-c') {
      command = args[++i] || command;
    } else if (arg === '--buffer-size' || arg === '-b') {
      bufferSize = parseInt(args[++i] || String(bufferSize), 10);
    } else if (arg === '--port') {
      port = parseInt(args[++i] || String(port), 10);
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  if (!command) {
    console.error('Error: Command is required');
    showHelp();
    process.exit(1);
  }

  return { prefix, command, bufferSize, port };
}

export function showHelp(): void {
  console.log(`
MCP Command Proxy - Run CLI commands with MCP

Usage:
  mcp-command-proxy [options]

Options:
  --prefix, -p        Name/prefix for the server (default: "CommandProxy")
  --command, -c       Command to run (required)
  --buffer-size, -b   Number of log lines to keep in memory (default: 300)
  --port              Port for HTTP server (default: 8080)
  --help, -h          Show this help message

Example:
  mcp-command-proxy -p "ExpoServer" -c "expo start" -b 500 --port 8080
  `);
}

// Main function
export async function main(): Promise<void> {
  try {
    const { prefix, command, bufferSize, port } = parseArgs();
    
    console.log(`Starting MCP Command Proxy with:
  - Prefix: ${prefix}
  - Command: ${command}
  - Buffer Size: ${bufferSize}
  - Port: ${port}
`);

    const server = await createServer({
      prefix,
      command,
      bufferSize,
      port
    });

    // Handle exit signals
    const exitHandler = (): void => {
      console.log('\nShutting down MCP Command Proxy...');
      server.stop();
      process.exit(0);
    };

    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);
    
    console.log(`
MCP Command Proxy is running!
- SSE endpoint: http://localhost:${port}/sse
- Messages endpoint: http://localhost:${port}/messages

Connect your MCP client to these endpoints.
`);
  } catch (error) {
    console.error('Error starting MCP Command Proxy:', error);
    process.exit(1);
  }
}

// Only run main if this is the entry point
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 