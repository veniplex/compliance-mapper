import { json, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

const VALID_STATUSES = ['not_started', 'in_progress', 'completed'];

export async function PUT({ request, params }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	const body = await request.json().catch(() => ({}));
	const { status, notes } = body;

	if (!VALID_STATUSES.includes(status)) {
		error(400, `status must be one of: ${VALID_STATUSES.join(', ')}.`);
	}

	try {
		const result = await pool.query(
			`INSERT INTO progress (user_id, control_id, status, notes, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, control_id) DO UPDATE
         SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
       RETURNING control_id, status, notes, updated_at`,
			[payload.sub, params.controlId, status, typeof notes === 'string' ? notes : '']
		);
		const row = result.rows[0];
		return json({
			data: {
				controlId: row.control_id,
				status: row.status,
				notes: row.notes,
				updatedAt: row.updated_at,
			},
		});
	} catch (err) {
		if (err.status) throw err;
		console.error('Upsert progress error:', err);
		error(500, 'Failed to save progress.');
	}
}

export async function DELETE({ request, params }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	try {
		await pool.query('DELETE FROM progress WHERE user_id = $1 AND control_id = $2', [payload.sub, params.controlId]);
		return new Response(null, { status: 204 });
	} catch (err) {
		if (err.status) throw err;
		console.error('Delete progress error:', err);
		error(500, 'Failed to delete progress.');
	}
}
