const mockMiddleware = jest.fn();

jest.mock('@clerk/clerk-sdk-node', () => ({
  ClerkExpressRequireAuth: jest.fn(() => mockMiddleware),
}));

describe('requireAuth middleware', () => {
  let requireAuth;
  let ClerkExpressRequireAuth;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.mock('@clerk/clerk-sdk-node', () => ({
      ClerkExpressRequireAuth: jest.fn(() => mockMiddleware),
    }));

    ({ ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node'));
    requireAuth = require('../middleware/requireAuth');
  });

  it('calls ClerkExpressRequireAuth() to create the middleware', () => {
    expect(ClerkExpressRequireAuth).toHaveBeenCalledTimes(1);
  });

  it('exports the result of ClerkExpressRequireAuth()', () => {
    expect(requireAuth).toBe(mockMiddleware);
  });

  it('exported value is a function', () => {
    expect(typeof requireAuth).toBe('function');
  });
});
