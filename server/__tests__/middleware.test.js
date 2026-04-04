const mockClerkMiddleware = jest.fn();

jest.mock('@clerk/clerk-sdk-node', () => ({
  ClerkExpressRequireAuth: jest.fn(() => mockClerkMiddleware),
}));

jest.mock('../lib/logger', () => ({
  error: jest.fn(),
}));

describe('requireAuth middleware', () => {
  let requireAuth;
  let ClerkExpressRequireAuth;
  let logger;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockClerkMiddleware.mockReset();

    ({ ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node'));
    logger = require('../lib/logger');
    requireAuth = require('../middleware/requireAuth');
  });

  it('calls ClerkExpressRequireAuth() to create the middleware', () => {
    expect(ClerkExpressRequireAuth).toHaveBeenCalledTimes(1);
  });

  it('exported value is a function', () => {
    expect(typeof requireAuth).toBe('function');
  });

  it('wraps Clerk middleware and calls next on success', () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    // Mock Clerk middleware to call callback with no error
    mockClerkMiddleware.mockImplementation((req, res, callback) => {
      callback(null);
    });

    requireAuth(req, res, next);

    expect(mockClerkMiddleware).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when Clerk middleware returns an error', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const error = new Error('Invalid token');

    // Mock Clerk middleware to call callback with an error
    mockClerkMiddleware.mockImplementation((req, res, callback) => {
      callback(error);
    });

    requireAuth(req, res, next);

    expect(mockClerkMiddleware).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('handles exceptions thrown by Clerk middleware', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    // Mock Clerk middleware to throw an exception
    mockClerkMiddleware.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    requireAuth(req, res, next);

    expect(mockClerkMiddleware).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});
