require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../lib/logger');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase SEMPRE requer SSL, em todos os ambientes
  ssl: {
    rejectUnauthorized: false,
  },
  // Forçar IPv4 (Render/Supabase podem ter problemas com IPv6)
  family: 4,
  // Timeouts mais robustos
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000,
  // Pool de conexões
  max: 10,
  min: 2,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', {
    message: err && err.message,
    code: err && err.code,
    errno: err && err.errno,
    host: err && err.host,
    port: err && err.port,
  });
});

pool.on('connect', () => {
  logger.info('✓ Database connection established', {
    host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'unknown',
  });
});

module.exports = pool;
