import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { error } from '@sveltejs/kit';
import { pool } from './db.js';

export const JWT_SECRET =
	process.env.JWT_SECRET ||
	(() => {
		const generated = createHash('sha256').update(Math.random().toString()).digest('hex');
		console.warn(
			'[auth] JWT_SECRET is not set. A random secret has been generated — sessions will be invalidated on server restart. Set JWT_SECRET in .env for persistent sessions.'
		);
		return generated;
	})();

const TOKEN_EXPIRY = '7d';

export function signToken(payload) {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verifies the JWT Bearer token from the Authorization header.
 * Returns the decoded payload or throws a 401 error.
 */
export function verifyToken(request) {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		error(401, 'Authentication required. Provide a Bearer token in the Authorization header.');
	}
	const token = authHeader.slice(7);
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch {
		error(401, 'Invalid or expired token.');
	}
}

/**
 * Validates an API key from the x-api-key header.
 * Returns true if valid, false otherwise. Returns true when no key is provided
 * (API keys are optional for read-only public endpoints).
 */
export async function validateApiKey(request) {
	const provided = request.headers.get('x-api-key');
	if (!provided) return true; // no key provided — allow through
	// Keys are stored as sha256(rawKey) -- matches createHash('sha256') in apikeys/+server.js
	const keyHash = createHash('sha256').update(provided).digest('hex');
	try {
		const result = await pool.query(
			'UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1 RETURNING user_id',
			[keyHash]
		);
		return result.rows.length > 0;
	} catch {
		return false;
	}
}
