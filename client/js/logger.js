/* logger.js - lightweight browser logger */

const Logger = (() => {
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

