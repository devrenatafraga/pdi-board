// middleware/requestLogger.js — logs incoming requests for debugging
const logger = require('../lib/logger');

function requestLogger(req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';
  const isDebug = process.env.LOG_LEVEL === 'debug';

  if (!isDev || !isDebug) {
    return next();
  }

  const method = req.method;
  const path = req.path;
  const hasAuth = Boolean(req.auth);
  const userId = req.auth?.userId ? `${req.auth.userId.substring(0, 8)}...` : 'none';
  const hasToken = Boolean(req.headers.authorization);

  logger.info(`➜ ${method} ${path}`, {
    auth: hasAuth ? `✓ userId=${userId}` : '✗ missing',
    token: hasToken ? '✓ present' : '✗ missing',
  });

  next();
}

module.exports = requestLogger;

