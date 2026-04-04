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
    mockMiddleware.mockReset();

    jest.mock('@clerk/clerk-sdk-node', () => ({
      ClerkExpressRequireAuth: jest.fn(() => mockMiddleware),
    }));

    ({ ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node'));
    requireAuth = require('../middleware/requireAuth');
  });

  it('calls ClerkExpressRequireAuth() to create the middleware', () => {
    expect(ClerkExpressRequireAuth).toHaveBeenCalledTimes(1);
  });

  it('exported value is a function', () => {
    expect(typeof requireAuth).toBe('function');
  });

  it('delegates directly to Clerk middleware', () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(mockMiddleware).toHaveBeenCalledTimes(1);
    expect(mockMiddleware).toHaveBeenCalledWith(req, res, next);
  });
});
