import { json, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

export async function DELETE({ request, params }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	try {
		await pool.query('DELETE FROM api_keys WHERE id = $1 AND user_id = $2', [params.id, payload.sub]);
		return new Response(null, { status: 204 });
	} catch (err) {
		if (err.status) throw err;
		console.error('Delete API key error:', err);
		error(500, 'Failed to delete API key.');
	}
}
