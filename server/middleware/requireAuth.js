const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const logger = require('../lib/logger');

const requireAuth = ClerkExpressRequireAuth();

// Wrap Clerk's requireAuth to handle errors gracefully
module.exports = (req, res, next) => {
  try {
    requireAuth(req, res, (err) => {
      if (err) {
        logger.error('Clerk auth error', {
          message: err && err.message,
          code: err && err.code,
          status: err && err.status,
        });
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    });
  } catch (err) {
    logger.error('Clerk auth middleware error', {
      message: err && err.message,
      stack: err && err.stack,
    });
    res.status(401).json({ error: 'Unauthorized' });
  }
};
