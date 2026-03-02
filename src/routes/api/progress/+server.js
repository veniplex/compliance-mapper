import { json, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

const VALID_STATUSES = ['not_started', 'in_progress', 'completed'];

export async function GET({ request, url }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	const framework = url.searchParams.get('framework');
	try {
		let query, params;
		if (framework) {
			query = 'SELECT control_id, status, notes, updated_at FROM progress WHERE user_id = $1 AND control_id LIKE $2 ORDER BY control_id';
			params = [payload.sub, `${framework}-%`];
		} else {
			query = 'SELECT control_id, status, notes, updated_at FROM progress WHERE user_id = $1 ORDER BY control_id';
			params = [payload.sub];
		}
		const result = await pool.query(query, params);
		return json({
			data: result.rows.map((r) => ({
				controlId: r.control_id,
				status: r.status,
				notes: r.notes,
				updatedAt: r.updated_at,
			})),
		});
	} catch (err) {
		if (err.status) throw err;
		console.error('Get progress error:', err);
		error(500, 'Failed to retrieve progress.');
	}
}
