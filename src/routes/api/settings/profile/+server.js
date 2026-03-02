import { json, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

function isValidEmail(email) {
	return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	try {
		const result = await pool.query('SELECT id, email, username FROM users WHERE id = $1', [payload.sub]);
		if (result.rows.length === 0) error(404, 'User not found.');
		return json({ data: result.rows[0] });
	} catch (err) {
		if (err.status) throw err;
		console.error('Get profile error:', err);
		error(500, 'Failed to load profile.');
	}
}

export async function PATCH({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	const body = await request.json().catch(() => ({}));
	const { username, email } = body;

	if (email !== undefined && !isValidEmail(email)) error(400, 'A valid email address is required.');
	if (username !== undefined) {
		if (typeof username !== 'string' || username.length > 50) error(400, 'Username must be at most 50 characters.');
		if (username.length > 0 && username.trim().length === 0) error(400, 'Username cannot be blank.');
	}

	const fields = [];
	const values = [];
	let idx = 1;
	if (username !== undefined) { fields.push(`username = $${idx++}`); values.push(username || null); }
	if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email.toLowerCase()); }
	if (fields.length === 0) error(400, 'No fields to update.');

	values.push(payload.sub);
	try {
		const result = await pool.query(
			`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, username`,
			values
		);
		return json({ data: result.rows[0] });
	} catch (err) {
		if (err.code === '23505') error(409, 'Email or username already in use.');
		if (err.status) throw err;
		console.error('Update profile error:', err);
		error(500, 'Failed to update profile.');
	}
}
