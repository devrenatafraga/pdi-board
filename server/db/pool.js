require('dotenv').config();
const dns = require('dns');
const { Pool } = require('pg');
const logger = require('../lib/logger');

// Node.js v17+ prefers IPv6 by default; Render cannot reach Supabase over IPv6
dns.setDefaultResultOrder('ipv4first');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000,
  max: 10,
  min: 2,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', {
    message: err && err.message,
    code: err && err.code,
  });
});

pool.on('connect', () => {
  logger.info('✓ Database connection established');
});

module.exports = pool;
