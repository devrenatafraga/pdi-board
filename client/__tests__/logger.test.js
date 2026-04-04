describe('Client Logger', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let Logger;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    Logger = (() => {
      function write(level, message, details) {
        const method = level === 'info' ? 'log' : level;
        const prefix = `[${level.toUpperCase()}]`;

        if (details === undefined) {
          console[method](prefix, message);
          return;
        }

        console[method](prefix, message, details);
      }

      return {
        info(message, details) {
          write('info', message, details);
        },
        warn(message, details) {
          write('warn', message, details);
        },
        error(message, details) {
          write('error', message, details);
        },
      };
    })();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('Logger.info() logs to console.log', () => {
    Logger.info('Test info');
    expect(consoleLogSpy).toHaveBeenCalled();
    const call = consoleLogSpy.mock.calls[0];
    expect(call[0]).toContain('[INFO]');
    expect(call[1]).toBe('Test info');
  });

  it('Logger.info() includes details when provided', () => {
    Logger.info('Message', { key: 'value' });
    expect(consoleLogSpy).toHaveBeenCalled();
    const call = consoleLogSpy.mock.calls[0];
    expect(call[2]).toEqual({ key: 'value' });
  });

  it('Logger.warn() logs to console.warn', () => {
    Logger.warn('Test warning');
    expect(consoleWarnSpy).toHaveBeenCalled();
    const call = consoleWarnSpy.mock.calls[0];
    expect(call[0]).toContain('[WARN]');
  });

  it('Logger.error() logs to console.error', () => {
    Logger.error('Test error');
    expect(consoleErrorSpy).toHaveBeenCalled();
    const call = consoleErrorSpy.mock.calls[0];
    expect(call[0]).toContain('[ERROR]');
  });

  it('Logger methods work without details', () => {
    Logger.info('Just message');
    Logger.warn('Just warning');
    Logger.error('Just error');

    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

