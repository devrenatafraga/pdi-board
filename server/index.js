require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const requireAuth = require('./middleware/requireAuth');
const apiRouter = require('./routes/api');
const reportsRouter = require('./routes/reports');
const logger = require('./lib/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Validate Clerk keys ────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || '';
const secretKey = process.env.CLERK_SECRET_KEY || '';

if (isProduction && (publishableKey.startsWith('pk_test_') || secretKey.startsWith('sk_test_'))) {
  logger.warn('⚠️  WARNING: Development Clerk keys detected in production!');
  logger.warn('Please use production keys: CLERK_PUBLISHABLE_KEY should start with pk_live_ and CLERK_SECRET_KEY should start with sk_live_');
  logger.warn('See: https://clerk.com/docs/deployments/overview');
}

app.use(cors());
app.use(express.json());

// Attach Clerk auth context to every request (does not block unauthenticated requests)
app.use(ClerkExpressWithAuth());

// Serve index.html with CLERK_PUBLISHABLE_KEY injected (must come BEFORE express.static
// so the route handler intercepts GET / instead of the static middleware serving it raw)
app.get('/', (req, res) => {
  const fs = require('node:fs');
  const indexPath = path.join(__dirname, '../client/index.html');
  let html = fs.readFileSync(indexPath, 'utf-8');
  html = html.replace('%%CLERK_PUBLISHABLE_KEY%%', process.env.CLERK_PUBLISHABLE_KEY || '');
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Static assets (JS, CSS, images) — index:false prevents auto-serving index.html
app.use(express.static(path.join(__dirname, '../client'), { index: false }));

// Public: current user info (returns null if not authenticated)
app.get('/api/me', (req, res) => {
  if (!req.auth?.userId) return res.json({ user: null });
  res.json({ user: { id: req.auth.userId } });
});

// Protected API routes — require valid Clerk JWT
app.use('/api', requireAuth, apiRouter);
app.use('/api/reports', requireAuth, reportsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  const status = err.status || 500;

  logger.error('Unhandled error', {
    message: err && err.message,
    code: err && err.code,
    status: status,
    stack: err && err.stack,
    path: req.path,
    method: req.method,
  });

  // Return more detailed error info in development
  if (isDev) {
    return res.status(status).json({
      error: err && err.message || 'Internal server error',
      code: err && err.code,
      ...(err && err.stack && { stack: err.stack }),
    });
  }

  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`PDI Board running at http://localhost:${PORT}`);
  });
}
