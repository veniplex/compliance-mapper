import { json, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

export async function GET({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');

	const payload = verifyToken(request);
	try {
		const result = await pool.query('SELECT id, email, username FROM users WHERE id = $1', [payload.sub]);
		if (result.rows.length === 0) error(401, 'User no longer exists.');
		const u = result.rows[0];
		return json({ data: { id: u.id, email: u.email, username: u.username } });
	} catch (err) {
		if (err.status) throw err;
		console.error('Auth me error:', err);
		error(500, 'Failed to verify session.');
	}
}
