/**
 * lib/logger.test.js
 * Testes unitários para o módulo logger
 */

describe('lib/logger', () => {
  let logger;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.resetModules();

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    process.env.LOG_LEVEL = 'info';
    logger = require('../lib/logger');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('logger.info()', () => {
    it('logs info messages to console.log', () => {
      logger.info('Test info message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('[INFO]');
      expect(call[1]).toBe('Test info message');
    });

    it('includes metadata in info logs', () => {
      logger.info('Test message', { userId: '123' });
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0];
      expect(call[2]).toEqual({ userId: '123' });
    });

    it('does not log when LOG_LEVEL is set to error', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'error';
      logger = require('../lib/logger');

      logger.info('This should not log');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('logs when LOG_LEVEL is debug (more verbose)', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'debug';
      logger = require('../lib/logger');
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.info('Debug level message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('logger.warn()', () => {
    it('logs warn messages to console.warn', () => {
      logger.warn('Test warning');
      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0];
      expect(call[0]).toContain('[WARN]');
      expect(call[1]).toBe('Test warning');
    });

    it('includes metadata in warn logs', () => {
      logger.warn('Warning message', { code: 'W001' });
      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0];
      expect(call[2]).toEqual({ code: 'W001' });
    });

    it('logs warn when LOG_LEVEL is warn or more verbose', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'warn';
      logger = require('../lib/logger');
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      logger.warn('Should log');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('logger.error()', () => {
    it('logs error messages to console.error', () => {
      logger.error('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).toContain('[ERROR]');
      expect(call[1]).toBe('Test error');
    });

    it('includes metadata in error logs', () => {
      logger.error('Error occurred', { statusCode: 500 });
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[2]).toEqual({ statusCode: 500 });
    });

    it('always logs errors even when LOG_LEVEL is error', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'error';
      logger = require('../lib/logger');
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.error('Fatal error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('LOG_LEVEL filtering', () => {
    it('respects LOG_LEVEL=error (only errors)', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'error';
      logger = require('../lib/logger');

      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.info('info');
      logger.error('error');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('respects LOG_LEVEL=debug (all levels)', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'debug';
      logger = require('../lib/logger');

      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(logSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('defaults to info level when LOG_LEVEL is not set', () => {
      jest.resetModules();
      delete process.env.LOG_LEVEL;
      logger = require('../lib/logger');

      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      logger.info('info');
      logger.warn('warn');

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('handles invalid LOG_LEVEL gracefully', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'invalid-level';
      logger = require('../lib/logger');

      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('info');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Timestamp format', () => {
    it('includes ISO timestamp in log messages', () => {
      const beforeTime = new Date().toISOString();
      logger.info('Timestamped message');
      const afterTime = new Date().toISOString();

      const call = consoleLogSpy.mock.calls[0];
      const prefix = call[0];

      expect(prefix).toMatch(/\[\d{4}-\d{2}-\d{2}T/); // ISO format check
      expect(prefix).toContain('[INFO]');
    });
  });
});

