import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { CircularBuffer } from './buffer.js';

/**
 * Log entry type for storing command output
 */
export interface LogEntry {
  timestamp: number;
  content: string;
  type: 'stdout' | 'stderr' | 'system';
}

/**
 * Process status type
 */
export enum ProcessStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * Events emitted by the CommandRunner
 */
export interface CommandRunnerEvents {
  log: (entry: LogEntry) => void;
  exit: (code: number, signal?: string) => void;
  error: (error: Error) => void;
  statusChange: (status: ProcessStatus) => void;
}

/**
 * CommandRunner options
 */
export interface CommandRunnerOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  logBufferSize?: number;
}

/**
 * Class that runs a command in a pseudo-terminal and captures output
 */
export class CommandRunner extends EventEmitter {
  private process: pty.IPty | null = null;
  private logBuffer: CircularBuffer<LogEntry>;
  private status: ProcessStatus = ProcessStatus.STOPPED;
  private readonly command: string;
  private readonly args: string[];
  private readonly cwd: string;
  private readonly env: NodeJS.ProcessEnv;

  /**
   * Create a new CommandRunner
   */
  constructor(options: CommandRunnerOptions) {
    super();
    
    // Parse command and arguments
    const parts = options.command.split(' ');
    this.command = parts[0];
    this.args = parts.slice(1).concat(options.args || []);
    
    this.cwd = options.cwd || process.cwd();
    this.env = options.env || process.env;
    this.logBuffer = new CircularBuffer<LogEntry>(options.logBufferSize || 300);
  }

  /**
   * Start the command process
   */
  start(): void {
    try {
      // Add a system log entry
      this.addLogEntry(`Starting command: ${this.command} ${this.args.join(' ')}`, 'system');
      
      // Spawn the process
      this.process = pty.spawn(this.command, this.args, {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: this.cwd,
        env: { ...this.env, FORCE_COLOR: '1', TERM: 'xterm-256color' },
        handleFlowControl: true,
      });

      // Set status to running
      this.setStatus(ProcessStatus.RUNNING);

      // Handle data events (output)
      this.process.onData((data) => {
        this.addLogEntry(data, 'stdout');
      });

      // Handle exit events
      this.process.onExit(({ exitCode, signal }) => {
        this.addLogEntry(`Process exited with code ${exitCode} and signal ${signal || 'none'}`, 'system');
        this.setStatus(ProcessStatus.STOPPED);
        this.emit('exit', exitCode, signal);
        this.process = null;
      });
    } catch (error) {
      this.setStatus(ProcessStatus.ERROR);
      this.addLogEntry(`Error starting command: ${error}`, 'system');
      this.emit('error', error);
    }
  }

  /**
   * Stop the command process
   */
  stop(): void {
    if (this.process && this.status === ProcessStatus.RUNNING) {
      this.addLogEntry('Stopping command...', 'system');
      this.process.kill();
    }
  }

  /**
   * Send data (key presses) to the process
   */
  write(data: string): void {
    if (this.process && this.status === ProcessStatus.RUNNING) {
      this.addLogEntry(`Attempting to write key: ${JSON.stringify(data)}`, 'system');
      try {
        this.process.write(data);
        this.addLogEntry(`Successfully wrote key`, 'system');
      } catch (err) {
        this.addLogEntry(`Failed to write key: ${err}`, 'system');
      }
    } else {
      this.addLogEntry('Cannot write to process: not running', 'system');
    }
  }

  /**
   * Get all log entries
   */
  getLogs(): LogEntry[] {
    return this.logBuffer.getAll();
  }

  /**
   * Get current process status
   */
  getStatus(): ProcessStatus {
    return this.status;
  }

  /**
   * Add a log entry to the buffer and emit a log event
   */
  private addLogEntry(content: string, type: LogEntry['type']): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      content,
      type,
    };
    
    this.logBuffer.push(entry);
    this.emit('log', entry);
  }

  /**
   * Set the process status and emit a status change event
   */
  private setStatus(status: ProcessStatus): void {
    this.status = status;
    this.emit('statusChange', this.status);
  }
} 