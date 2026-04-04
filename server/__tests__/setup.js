// Jest setup file for server tests
// Runs before each test file

// Ensure environment variables are set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Set a dummy DATABASE_URL for unit tests that mock the pool
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
}

// Increase max listeners to prevent warnings in CI
process.setMaxListeners(15);

// Clear all mocks before each test file
afterEach(() => {
  jest.clearAllMocks();
});

// Suppress dotenv warnings in tests
process.env.DOTENV_KEY = undefined;
