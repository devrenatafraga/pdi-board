const logger = require('./logger');

function getUserId(req) {
  const userId = req.auth?.userId || null;

  // Log diagnostic info in development
  if (process.env.NODE_ENV === 'development' && process.env.LOG_LEVEL === 'debug') {
    logger.info('getUserId', {
      hasAuth: Boolean(req.auth),
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      hasAuthHeader: Boolean(req.headers.authorization),
    });
  }

  return userId;
}

module.exports = { getUserId };
