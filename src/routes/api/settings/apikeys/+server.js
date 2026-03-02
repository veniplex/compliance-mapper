import { json, error } from '@sveltejs/kit';
import { createHash, randomBytes } from 'crypto';
import { pool } from '$lib/server/db.js';
import { verifyToken } from '$lib/server/auth.js';

export async function GET({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	try {
		const result = await pool.query(
			'SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
			[payload.sub]
		);
		return json({
			data: result.rows.map((r) => ({
				id: r.id,
				name: r.name,
				keyPrefix: r.key_prefix,
				createdAt: r.created_at,
				lastUsedAt: r.last_used_at,
			})),
		});
	} catch (err) {
		if (err.status) throw err;
		console.error('List API keys error:', err);
		error(500, 'Failed to load API keys.');
	}
}

export async function POST({ request }) {
	if (process.env.STANDALONE_MODE === 'true') error(503, 'Database is disabled.');
	const payload = verifyToken(request);
	const body = await request.json().catch(() => ({}));
	const { name } = body;

	const rawKey = 'cm_' + randomBytes(32).toString('hex');
	const keyPrefix = rawKey.slice(0, 10);
	const keyHash = createHash('sha256').update(rawKey).digest('hex');

	try {
		const result = await pool.query(
			'INSERT INTO api_keys (user_id, name, key_hash, key_prefix) VALUES ($1, $2, $3, $4) RETURNING id, name, key_prefix, created_at',
			[payload.sub, name || '', keyHash, keyPrefix]
		);
		const row = result.rows[0];
		return json(
			{
				data: {
					id: row.id,
					name: row.name,
					keyPrefix: row.key_prefix,
					key: rawKey,
					createdAt: row.created_at,
				},
			},
			{ status: 201 }
		);
	} catch (err) {
		if (err.status) throw err;
		console.error('Create API key error:', err);
		error(500, 'Failed to create API key.');
	}
}
