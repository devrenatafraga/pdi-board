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
  });
});

pool.on('connect', () => {
  logger.info('✓ Database connection established');
});

module.exports = pool;
