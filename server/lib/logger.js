const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const currentLevel = LEVELS[envLevel] ?? LEVELS.info;

function shouldLog(level) {
  return LEVELS[level] <= currentLevel;
}

function write(level, message, meta) {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const method = level === 'info' ? 'log' : level;

  if (meta === undefined) {
    console[method](prefix, message);
    return;
  }

  console[method](prefix, message, meta);
}

module.exports = {
  info(message, meta) {
    write('info', message, meta);
  },
  warn(message, meta) {
    write('warn', message, meta);
  },
  error(message, meta) {
    write('error', message, meta);
  },
};

