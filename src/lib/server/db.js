import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '5432', 10),
	database: process.env.DB_NAME || 'compliance_mapper',
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || '',
	ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export const STANDALONE_MODE = process.env.STANDALONE_MODE === 'true';

/**
 * Creates the necessary database tables if they don't already exist.
 */
export async function initDb() {
	await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      username      TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS progress (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      control_id TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'not_started',
      notes      TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, control_id)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL DEFAULT '',
      key_hash     TEXT NOT NULL UNIQUE,
      key_prefix   TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    );
  `);
	await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;`);
}
