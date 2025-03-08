import { CommandRunner, ProcessStatus } from './command-runner';
import * as pty from 'node-pty';

// Mock node-pty
jest.mock('node-pty', () => ({
  spawn: jest.fn(() => ({
    onData: jest.fn(),
    onExit: jest.fn(),
    write: jest.fn(),
    kill: jest.fn(),
  })),
}));

describe('CommandRunner', () => {
  let runner: CommandRunner;
  let mockProcess: jest.Mocked<pty.IPty>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcess = {
      onData: jest.fn(),
      onExit: jest.fn(),
      write: jest.fn(),
      kill: jest.fn(),
    } as unknown as jest.Mocked<pty.IPty>;
    (pty.spawn as jest.Mock).mockReturnValue(mockProcess);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      runner = new CommandRunner({ command: 'test-cmd' });
      expect(runner.getStatus()).toBe(ProcessStatus.STOPPED);
      expect(runner.getLogs()).toEqual([]);
    });

    it('should parse command and arguments correctly', () => {
      runner = new CommandRunner({ 
        command: 'test-cmd arg1 arg2',
        args: ['arg3']
      });
      runner.start();
      expect(pty.spawn).toHaveBeenCalledWith(
        'test-cmd',
        ['arg1', 'arg2', 'arg3'],
        expect.any(Object)
      );
    });

    it('should use provided options', () => {
      const cwd = '/test/dir';
      const env = { TEST_ENV: 'value' };
      runner = new CommandRunner({ 
        command: 'test-cmd',
        cwd,
        env,
        logBufferSize: 100
      });
      runner.start();
      expect(pty.spawn).toHaveBeenCalledWith(
        'test-cmd',
        [],
        expect.objectContaining({
          cwd,
          env: expect.objectContaining(env)
        })
      );
    });
  });

  describe('process lifecycle', () => {
    beforeEach(() => {
      runner = new CommandRunner({ command: 'test-cmd' });
    });

    it('should start process and update status', () => {
      const statusListener = jest.fn();
      runner.on('statusChange', statusListener);
      
      runner.start();
      
      expect(runner.getStatus()).toBe(ProcessStatus.RUNNING);
      expect(statusListener).toHaveBeenCalledWith(ProcessStatus.RUNNING);
      expect(pty.spawn).toHaveBeenCalled();
    });

    it('should handle process exit', () => {
      const exitListener = jest.fn();
      const statusListener = jest.fn();
      runner.on('exit', exitListener);
      runner.on('statusChange', statusListener);
      
      runner.start();
      const exitCallback = (mockProcess.onExit as jest.Mock).mock.calls[0][0];
      exitCallback({ exitCode: 0, signal: null });
      
      expect(runner.getStatus()).toBe(ProcessStatus.STOPPED);
      expect(exitListener).toHaveBeenCalledWith(0, null);
      expect(statusListener).toHaveBeenCalledWith(ProcessStatus.STOPPED);
    });

    it('should stop process', () => {
      runner.start();
      runner.stop();
      
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe('log management', () => {
    beforeEach(() => {
      runner = new CommandRunner({ command: 'test-cmd' });
    });

    it('should capture stdout', () => {
      const logListener = jest.fn();
      runner.on('log', logListener);
      
      runner.start();
      const dataCallback = (mockProcess.onData as jest.Mock).mock.calls[0][0];
      dataCallback('test output');
      
      const logs = runner.getLogs();
      expect(logs).toHaveLength(2); // Including start command log
      expect(logs[1].content).toBe('test output');
      expect(logs[1].type).toBe('stdout');
      expect(logListener).toHaveBeenCalledWith(expect.objectContaining({
        content: 'test output',
        type: 'stdout'
      }));
    });

    it('should respect log buffer size', () => {
      runner = new CommandRunner({ 
        command: 'test-cmd',
        logBufferSize: 2
      });
      
      runner.start();
      const dataCallback = (mockProcess.onData as jest.Mock).mock.calls[0][0];
      dataCallback('output1');
      dataCallback('output2');
      dataCallback('output3');
      
      const logs = runner.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs.map(l => l.content)).toEqual(['output2', 'output3']);
    });
  });

  describe('error handling', () => {
    it('should handle spawn errors', () => {
      const error = new Error('Spawn error');
      (pty.spawn as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const errorListener = jest.fn();
      runner = new CommandRunner({ command: 'test-cmd' });
      runner.on('error', errorListener);
      
      runner.start();
      
      expect(runner.getStatus()).toBe(ProcessStatus.ERROR);
      expect(errorListener).toHaveBeenCalledWith(error);
    });

    it('should handle write errors', () => {
      runner = new CommandRunner({ command: 'test-cmd' });
      runner.start();
      
      mockProcess.write.mockImplementation(() => {
        throw new Error('Write error');
      });
      
      runner.write('test');
      
      const logs = runner.getLogs();
      expect(logs.some(log => 
        log.type === 'system' && 
        log.content.includes('Failed to write key')
      )).toBe(true);
    });
  });

  describe('write', () => {
    beforeEach(() => {
      runner = new CommandRunner({ command: 'test-cmd' });
    });

    it('should write to process when running', () => {
      runner.start();
      runner.write('test input');
      
      expect(mockProcess.write).toHaveBeenCalledWith('test input');
    });

    it('should not write when process is stopped', () => {
      runner.write('test input');
      
      expect(mockProcess.write).not.toHaveBeenCalled();
      const logs = runner.getLogs();
      expect(logs.some(log => 
        log.type === 'system' && 
        log.content.includes('Cannot write to process: not running')
      )).toBe(true);
    });
  });
});