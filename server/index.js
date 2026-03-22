require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const requireAuth = require('./middleware/requireAuth');
const apiRouter = require('./routes/api');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Attach Clerk auth context to every request (does not block unauthenticated requests)
app.use(ClerkExpressWithAuth());

app.use(express.static(path.join(__dirname, '../client')));

// Public: current user info (returns null if not authenticated)
app.get('/api/me', (req, res) => {
  if (!req.auth?.userId) return res.json({ user: null });
  res.json({ user: { id: req.auth.userId } });
});

// Serve index.html with CLERK_PUBLISHABLE_KEY injected
app.get('/', (req, res) => {
  const fs = require('fs');
  const indexPath = path.join(__dirname, '../client/index.html');
  let html = fs.readFileSync(indexPath, 'utf-8');
  html = html.replace('%%CLERK_PUBLISHABLE_KEY%%', process.env.CLERK_PUBLISHABLE_KEY || '');
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Protected API routes — require valid Clerk JWT
app.use('/api', requireAuth, apiRouter);
app.use('/api/reports', requireAuth, reportsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`PDI Board rodando em http://localhost:${PORT}`);
});
