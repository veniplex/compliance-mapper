import { json, error } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

export async function PATCH({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	const body = await request.json().catch(() => ({}));
	const { currentPassword, newPassword } = body;

	if (!currentPassword || !newPassword) error(400, 'currentPassword and newPassword are required.');
	if (typeof newPassword !== 'string' || newPassword.length < 8) error(400, 'New password must be at least 8 characters.');
	if (newPassword.length > 128) error(400, 'New password must be at most 128 characters.');

	try {
		const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [payload.sub]);
		if (result.rows.length === 0) error(404, 'User not found.');
		const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
		if (!match) error(401, 'Current password is incorrect.');
		const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
		await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, payload.sub]);
		return json({ data: { message: 'Password updated successfully.' } });
	} catch (err) {
		if (err.status) throw err;
		console.error('Change password error:', err);
		error(500, 'Failed to change password.');
	}
}
