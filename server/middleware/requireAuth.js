const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const logger = require('../lib/logger');

const requireAuth = ClerkExpressRequireAuth();

// Wrap Clerk's requireAuth to handle errors gracefully with better diagnostics
module.exports = (req, res, next) => {
  try {
    requireAuth(req, res, (err) => {
      if (err) {
        const isDev = process.env.NODE_ENV === 'development';

        // Log detailed error info in development
        if (isDev) {
          logger.error('Clerk auth error (development)', {
            message: err && err.message,
            code: err && err.code,
            status: err && err.status,
            authHeader: req.headers.authorization ? '✓ present' : '✗ missing',
            clerkAuth: req.auth ? `✓ userId=${req.auth.userId}` : '✗ missing',
            details: err && err.toString(),
          });
        } else {
          // Minimal logging in production
          logger.error('Clerk auth error', {
            message: err && err.message,
            code: err && err.code,
          });
        }

        return res.status(401).json({
          error: 'Unauthorized',
          ...(isDev && { details: err && err.message }),
        });
      }
      next();
    });
  } catch (err) {
    const isDev = process.env.NODE_ENV === 'development';

    logger.error('Clerk auth middleware error', {
      message: err && err.message,
      ...(isDev && { stack: err && err.stack }),
    });

    res.status(401).json({
      error: 'Unauthorized',
      ...(isDev && { details: err && err.message }),
    });
  }
};
