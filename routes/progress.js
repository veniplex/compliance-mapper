'use strict';

const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['not_started', 'in_progress', 'completed'];

// All progress routes require authentication
router.use(requireAuth);

/**
 * GET /api/progress
 * Returns all progress entries for the authenticated user.
 * Supports optional ?framework= filter.
 */
router.get('/', async (req, res) => {
  const { framework } = req.query;
  try {
    let query;
    let params;
    if (framework) {
      query = 'SELECT control_id, status, notes, updated_at FROM progress WHERE user_id = $1 AND control_id LIKE $2 ORDER BY control_id';
      params = [req.user.sub, `${framework}-%`];
    } else {
      query = 'SELECT control_id, status, notes, updated_at FROM progress WHERE user_id = $1 ORDER BY control_id';
      params = [req.user.sub];
    }
    const result = await pool.query(query, params);
    res.json({
      data: result.rows.map(r => ({
        controlId: r.control_id,
        status: r.status,
        notes: r.notes,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'Failed to retrieve progress.' });
  }
});

/**
 * PUT /api/progress/:controlId
 * Body: { status, notes? }
 * Creates or updates the progress entry for a specific control.
 */
router.put('/:controlId', async (req, res) => {
  const { controlId } = req.params;
  const { status, notes } = req.body || {};

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  try {
    const result = await pool.query(
      `INSERT INTO progress (user_id, control_id, status, notes, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, control_id) DO UPDATE
         SET status = EXCLUDED.status,
             notes  = EXCLUDED.notes,
             updated_at = NOW()
       RETURNING control_id, status, notes, updated_at`,
      [req.user.sub, controlId, status, typeof notes === 'string' ? notes : '']
    );
    const row = result.rows[0];
    res.json({
      data: {
        controlId: row.control_id,
        status: row.status,
        notes: row.notes,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Upsert progress error:', err);
    res.status(500).json({ error: 'Failed to save progress.' });
  }
});

/**
 * DELETE /api/progress/:controlId
 * Removes the progress entry for a specific control (resets to "not started").
 */
router.delete('/:controlId', async (req, res) => {
  const { controlId } = req.params;
  try {
    await pool.query(
      'DELETE FROM progress WHERE user_id = $1 AND control_id = $2',
      [req.user.sub, controlId]
    );
    res.status(204).end();
  } catch (err) {
    console.error('Delete progress error:', err);
    res.status(500).json({ error: 'Failed to delete progress.' });
  }
});

module.exports = router;
