require('dotenv').config();
const { Pool } = require('pg');
const dns = require('dns').promises;
const logger = require('../lib/logger');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

async function getPoolConfig() {
  const url = new URL(process.env.DATABASE_URL);
  const hostname = url.hostname;

  try {
    const ipv4Address = await dns.resolve4(hostname);
    if (ipv4Address && ipv4Address.length > 0) {
      logger.info(`✓ DNS resolved ${hostname} to ${ipv4Address[0]}`);
      url.hostname = ipv4Address[0];
    }
  } catch (err) {
    logger.warn(`Could not resolve IPv4 for ${hostname}, using hostname`, {
      error: err.message,
    });
  }

  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    max: 10,
    min: 2,
  };
}

let pool;

// Initialize pool with IPv4 DNS resolution
async function initPool() {
  const config = await getPoolConfig();
  pool = new Pool(config);

  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', {
      message: err && err.message,
      code: err && err.code,
      errno: err && err.errno,
    });
  });

  pool.on('connect', () => {
    logger.info('✓ Database connection established');
  });

  return pool;
}

if (require.main === module) {
  initPool().catch(err => {
    logger.error('Failed to initialize pool', { message: err.message });
    process.exit(1);
  });
}

let poolInstance = null;

async function getPool() {
  if (!poolInstance) {
    poolInstance = await initPool();
  }
  return poolInstance;
}

module.exports = {
  async query(...args) {
    const p = await getPool();
    return p.query(...args);
  },
  async end() {
    if (poolInstance) {
      return poolInstance.end();
    }
  },
  async connect() {
    const p = await getPool();
    return p.connect();
  },
};
