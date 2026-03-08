import { json, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

/**
 * GET /api/todos
 * Returns all todo check states for the authenticated user.
 * Response: { data: { [controlId]: { [todoIndex]: boolean } } }
 */
export async function GET({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	try {
		const result = await pool.query(
			`SELECT control_id, todo_index, checked FROM control_todo_checks WHERE user_id = $1`,
			[payload.sub]
		);
		/** @type {Record<string, Record<number, boolean>>} */
		const data = {};
		for (const row of result.rows) {
			if (!data[row.control_id]) data[row.control_id] = {};
			data[row.control_id][row.todo_index] = row.checked;
		}
		return json({ data });
	} catch (err) {
		if (err.status) throw err;
		console.error('Load todos error:', err);
		error(500, 'Failed to load todos.');
	}
}
