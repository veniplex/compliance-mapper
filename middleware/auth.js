'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn('[auth] JWT_SECRET is not set. A random secret has been generated — sessions will be invalidated on server restart. Set JWT_SECRET in .env for persistent sessions.');
  return generated;
})();

/**
 * Express middleware that verifies the JWT token from the Authorization header.
 * Attaches the decoded payload to req.user on success.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Provide a Bearer token in the Authorization header.' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth, JWT_SECRET };
