const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

/**
 * Middleware that verifies the Clerk JWT present in the Authorization header.
 * On success, injects req.auth.userId (Clerk user ID) into the request.
 * Returns 401 if the token is missing or invalid.
 *
 * Requires env vars: CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
 */
const requireAuth = ClerkExpressRequireAuth();

module.exports = requireAuth;
