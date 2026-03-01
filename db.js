'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'compliance_mapper',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Creates the necessary database tables if they don't already exist.
 */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  `);
}

module.exports = { pool, initDb };
