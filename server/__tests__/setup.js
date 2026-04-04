// Jest setup file for server tests
// Runs before each test file

// Ensure environment variables are set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Increase max listeners to prevent warnings in CI
process.setMaxListeners(15);

// Clear all mocks before each test file
afterEach(() => {
  jest.clearAllMocks();
});

// Suppress dotenv logs in tests
process.env.DOTENV_KEY = undefined;

