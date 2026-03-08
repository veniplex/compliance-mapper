import { json, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

/**
 * GET /api/todos/[controlId]
 * Returns todo check states for a specific control.
 * Response: { data: { [todoIndex]: boolean } }
 */
export async function GET({ request, params }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	try {
		const result = await pool.query(
			`SELECT todo_index, checked FROM control_todo_checks WHERE user_id = $1 AND control_id = $2`,
			[payload.sub, params.controlId]
		);
		/** @type {Record<number, boolean>} */
		const data = {};
		for (const row of result.rows) {
			data[row.todo_index] = row.checked;
		}
		return json({ data });
	} catch (err) {
		if (err.status) throw err;
		console.error('Load control todos error:', err);
		error(500, 'Failed to load todos.');
	}
}

/**
 * PUT /api/todos/[controlId]
 * Saves a single todo check state.
 * Body: { todoIndex: number, checked: boolean }
 * Response: { data: { controlId, todoIndex, checked, updatedAt } }
 */
export async function PUT({ request, params }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	const body = await request.json().catch(() => ({}));
	const { todoIndex, checked } = body;

	if (typeof todoIndex !== 'number' || !Number.isInteger(todoIndex) || todoIndex < 0) {
		error(400, 'todoIndex must be a non-negative integer.');
	}
	if (typeof checked !== 'boolean') {
		error(400, 'checked must be a boolean.');
	}

	try {
		const result = await pool.query(
			`INSERT INTO control_todo_checks (user_id, control_id, todo_index, checked, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, control_id, todo_index) DO UPDATE
         SET checked = EXCLUDED.checked, updated_at = NOW()
       RETURNING control_id, todo_index, checked, updated_at`,
			[payload.sub, params.controlId, todoIndex, checked]
		);
		const row = result.rows[0];
		return json({
			data: {
				controlId: row.control_id,
				todoIndex: row.todo_index,
				checked: row.checked,
				updatedAt: row.updated_at,
			},
		});
	} catch (err) {
		if (err.status) throw err;
		console.error('Save todo check error:', err);
		error(500, 'Failed to save todo check.');
	}
}
