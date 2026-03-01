'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const TOKEN_EXPIRY = '7d';

// Minimal email format validation (does not verify deliverability)
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /api/auth/register
 * Body: { email, password }
 * Creates a new user account.
 */
router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.status(201).json({ data: { token, user: { id: user.id, email: user.email, createdAt: user.created_at } } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns a JWT token on success.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ data: { token, user: { id: user.id, email: user.email } } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
