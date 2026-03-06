import { json, error } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { pool } from '$lib/server/db.js';
import { signToken } from '$lib/server/auth.js';

function isValidEmail(email) {
	return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled. Sign in and progress tracking are unavailable.');

	const body = await request.json().catch(() => ({}));
	const { email, password } = body;

	if (!isValidEmail(email) || typeof password !== 'string') error(400, 'Email and password are required.');

	try {
		const result = await pool.query(
			'SELECT id, email, username, password_hash FROM users WHERE email = $1',
			[email.toLowerCase()]
		);
		const u = result.rows[0];
		if (!u) error(401, 'Invalid email or password.');

		const match = await bcrypt.compare(password, u.password_hash);
		if (!match) error(401, 'Invalid email or password.');

		const token = signToken({ sub: u.id, email: u.email });
		return json({ data: { token, user: { id: u.id, email: u.email, username: u.username } } });
	} catch (err) {
		if (err.status) throw err;
		console.error('Login error:', err);
		error(500, 'Login failed. Please try again.');
	}
}
