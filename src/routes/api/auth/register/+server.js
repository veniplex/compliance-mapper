import { json, error } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { pool } from '$lib/server/db.js';
import { signToken } from '$lib/server/auth.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function isValidEmail(email) {
	return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled. Sign in and progress tracking are unavailable.');

	const body = await request.json().catch(() => ({}));
	const { email, password, username } = body;

	if (!isValidEmail(email)) error(400, 'A valid email address is required.');
	if (typeof password !== 'string' || password.length < 8) error(400, 'Password must be at least 8 characters long.');
	if (password.length > 128) error(400, 'Password must be at most 128 characters long.');

	try {
		const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
		const result = await pool.query(
			'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
			[email.toLowerCase(), username || null, hash]
		);
		const u = result.rows[0];
		const token = signToken({ sub: u.id, email: u.email });
		return json(
			{ data: { token, user: { id: u.id, email: u.email, username: u.username, createdAt: u.created_at } } },
			{ status: 201 }
		);
	} catch (err) {
		if (err.code === '23505') error(409, 'An account with this email already exists.');
		console.error('Register error:', err);
		error(500, 'Registration failed. Please try again.');
	}
}
