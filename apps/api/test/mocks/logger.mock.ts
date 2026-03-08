// test/mocks/logger.mock.ts
import { jest } from '@jest/globals';

export class LoggerMock {
  log = jest.fn();
  error = jest.fn();
  warn = jest.fn();
  debug = jest.fn();
  verbose = jest.fn();
  
  // NestJS Logger methods
  info = jest.fn();
  
  // For compatibility with different logger interfaces
  fatal = jest.fn();
  emerg = jest.fn();
  
  // Track if any logs were made
  get allCalls() {
    return [
      ...this.log.mock.calls,
      ...this.error.mock.calls,
      ...this.warn.mock.calls,
      ...this.debug.mock.calls,
      ...this.verbose.mock.calls,
      ...this.info.mock.calls,
    ];
  }
  
  // Helper to reset all mocks
  reset() {
    this.log.mockClear();
    this.error.mockClear();
    this.warn.mockClear();
    this.debug.mockClear();
    this.verbose.mockClear();
    this.info.mockClear();
    this.fatal.mockClear();
    this.emerg.mockClear();
  }
  
  // Helper to check if a specific log was made
  containsLog(message: string | RegExp): boolean {
    return this.allCalls.some(call => {
      const logMessage = String(call[0] || '');
      if (message instanceof RegExp) {
        return message.test(logMessage);
      }
      return logMessage.includes(message);
    });
  }
  
  // Helper to count logs by level
  getCounts() {
    return {
      log: this.log.mock.calls.length,
      error: this.error.mock.calls.length,
      warn: this.warn.mock.calls.length,
      debug: this.debug.mock.calls.length,
      verbose: this.verbose.mock.calls.length,
      info: this.info.mock.calls.length,
      total: this.allCalls.length,
    };
  }
}

// Factory function for easy creation
export const createMockLogger = (): LoggerMock => new LoggerMock();

// Default instance for convenience
export const mockLogger = createMockLogger();