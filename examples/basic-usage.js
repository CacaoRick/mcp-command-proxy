/**
 * Basic usage example for mcp-command-proxy
 * 
 * This example shows how to create an MCP server that runs the "echo" command
 * and demonstrates how to interact with it programmatically.
 * 
 * @copyright 2025 Hormold
 * @license MIT
 */

import { createServer } from 'mcp-command-proxy';

// Create a server that runs "echo Hello, MCP!"
const server = await createServer({
  prefix: 'ExampleServer',
  command: 'echo "Hello, MCP!"',
  bufferSize: 100,
  port: 8080
});

console.log('MCP server started. Press Ctrl+C to exit.');

// Handle exit signals
process.on('SIGINT', () => {
  console.log('Shutting down MCP server...');
  server.stop();
  process.exit(0);
});

/**
 * In a real application, you might want to do something with the server
 * For example, you could expose it via a REST API or use it for automation
 * 
 * Example of accessing logs programmatically:
 * 
 * import { CommandRunner } from 'mcp-command-proxy';
 * 
 * // Create a command runner directly
 * const runner = new CommandRunner({
 *   command: 'npm start',
 *   logBufferSize: 500
 * });
 * 
 * // Handle logs
 * runner.on('log', (entry) => {
 *   console.log(`[${entry.type}] ${entry.content}`);
 * });
 * 
 * // Start the command
 * runner.start();
 * 
 * // Send input
 * runner.write('y\n');
 * 
 * // Get logs
 * const logs = runner.getLogs();
 * 
 * // Stop the command
 * runner.stop();
 */ 