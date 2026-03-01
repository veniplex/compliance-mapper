'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * GET /api/settings/profile
 * Returns the current user's profile.
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

/**
 * PATCH /api/settings/profile
 * Body: { username?, email? }
 * Updates the current user's profile.
 */
router.patch('/profile', requireAuth, async (req, res) => {
  const { username, email } = req.body || {};

  if (email !== undefined && !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (username !== undefined) {
    if (typeof username !== 'string' || username.length > 50) {
      return res.status(400).json({ error: 'Username must be at most 50 characters.' });
    }
    if (username.length > 0 && username.trim().length === 0) {
      return res.status(400).json({ error: 'Username cannot be blank.' });
    }
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (username !== undefined) { fields.push(`username = $${idx++}`); values.push(username || null); }
  if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email.toLowerCase()); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  values.push(req.user.sub);
  try {
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, username`,
      values
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email or username already in use.' });
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

/**
 * PATCH /api/settings/password
 * Body: { currentPassword, newPassword }
 * Changes the current user's password.
 */
router.patch('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.sub]);
    res.json({ data: { message: 'Password updated successfully.' } });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

/**
 * GET /api/settings/apikeys
 * Returns the current user's API keys (without the raw key).
 */
router.get('/apikeys', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.sub]
    );
    res.json({
      data: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        keyPrefix: r.key_prefix,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
      })),
    });
  } catch (err) {
    console.error('List API keys error:', err);
    res.status(500).json({ error: 'Failed to load API keys.' });
  }
});

/**
 * POST /api/settings/apikeys
 * Body: { name? }
 * Creates a new API key. The raw key is returned once.
 */
router.post('/apikeys', requireAuth, async (req, res) => {
  const { name } = req.body || {};

  const rawKey = 'cm_' + crypto.randomBytes(32).toString('hex');
  const keyPrefix = rawKey.slice(0, 10);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  try {
    const result = await pool.query(
      'INSERT INTO api_keys (user_id, name, key_hash, key_prefix) VALUES ($1, $2, $3, $4) RETURNING id, name, key_prefix, created_at',
      [req.user.sub, name || '', keyHash, keyPrefix]
    );
    const row = result.rows[0];
    res.status(201).json({
      data: {
        id: row.id,
        name: row.name,
        keyPrefix: row.key_prefix,
        key: rawKey,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    console.error('Create API key error:', err);
    res.status(500).json({ error: 'Failed to create API key.' });
  }
});

/**
 * DELETE /api/settings/apikeys/:id
 * Deletes an API key belonging to the current user.
 */
router.delete('/apikeys/:id', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.sub]
    );
    res.status(204).end();
  } catch (err) {
    console.error('Delete API key error:', err);
    res.status(500).json({ error: 'Failed to delete API key.' });
  }
});

module.exports = router;
