'use strict';

process.env.API_KEYS = 'test-api-key-123';
process.env.JWT_SECRET = 'test-jwt-secret-for-tests';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const jwt = require('jsonwebtoken');

// ── Mock the database pool before loading the app ─────────────────────────────

const mockPool = {
  _nextResult: { rows: [] },
  _nextError: null,
  async query(_sql, _params) {
    if (this._nextError) {
      const err = this._nextError;
      this._nextError = null;
      throw err;
    }
    const result = this._nextResult;
    this._nextResult = { rows: [] };
    return result;
  },
};

// Inject mock before the app module is loaded
require.cache[path.resolve(__dirname, '../db.js')] = {
  id: path.resolve(__dirname, '../db.js'),
  filename: path.resolve(__dirname, '../db.js'),
  loaded: true,
  exports: { pool: mockPool, initDb: async () => {} },
};

const app = require('../server');

let server;
let baseUrl;

before(() => new Promise(resolve => {
  server = http.createServer(app);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
    resolve();
  });
}));

after(() => new Promise(resolve => {
  server.close(resolve);
}));

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${urlPath}`);
    const bodyStr = body ? JSON.stringify(body) : null;
    const rawHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': 'test-api-key-123',
      ...headers,
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    };
    const filteredHeaders = Object.fromEntries(
      Object.entries(rawHeaders).filter(([, v]) => v !== undefined)
    );
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: filteredHeaders,
    };
    const req = http.request(options, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(data) });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── POST /api/auth/register ────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('returns 400 when email is missing', async () => {
    const { status, body } = await request('POST', '/api/auth/register', { password: 'password123' });
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  test('returns 400 when email is invalid', async () => {
    const { status, body } = await request('POST', '/api/auth/register', { email: 'not-an-email', password: 'password123' });
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  test('returns 400 when password is too short', async () => {
    const { status, body } = await request('POST', '/api/auth/register', { email: 'user@example.com', password: 'short' });
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  test('returns 400 when password is missing', async () => {
    const { status, body } = await request('POST', '/api/auth/register', { email: 'user@example.com' });
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  test('returns 201 with token and user on success', async () => {
    mockPool._nextResult = {
      rows: [{ id: 1, email: 'user@example.com', created_at: new Date().toISOString() }],
    };
    const { status, body } = await request('POST', '/api/auth/register', { email: 'user@example.com', password: 'securepassword' });
    assert.equal(status, 201);
    assert.ok(body.data.token, 'Expected JWT token');
    assert.ok(body.data.user, 'Expected user object');
    assert.equal(body.data.user.email, 'user@example.com');
    // Verify the token is a valid JWT
    const decoded = jwt.verify(body.data.token, process.env.JWT_SECRET);
    assert.equal(decoded.email, 'user@example.com');
  });

  test('returns 409 when email already exists', async () => {
    const err = new Error('duplicate key');
    err.code = '23505';
    mockPool._nextError = err;
    const { status, body } = await request('POST', '/api/auth/register', { email: 'taken@example.com', password: 'securepassword' });
    assert.equal(status, 409);
    assert.ok(body.error);
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('returns 400 when body is empty', async () => {
    const { status, body } = await request('POST', '/api/auth/login', {});
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  test('returns 401 when user does not exist', async () => {
    mockPool._nextResult = { rows: [] }; // no user found
    const { status, body } = await request('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'password123' });
    assert.equal(status, 401);
    assert.ok(body.error);
  });

  test('returns 401 when password is wrong', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('correct-password', 10);
    mockPool._nextResult = { rows: [{ id: 1, email: 'user@example.com', password_hash: hash }] };
    const { status, body } = await request('POST', '/api/auth/login', { email: 'user@example.com', password: 'wrong-password' });
    assert.equal(status, 401);
    assert.ok(body.error);
  });

  test('returns 200 with token on valid credentials', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('mypassword', 10);
    mockPool._nextResult = { rows: [{ id: 2, email: 'valid@example.com', password_hash: hash }] };
    const { status, body } = await request('POST', '/api/auth/login', { email: 'valid@example.com', password: 'mypassword' });
    assert.equal(status, 200);
    assert.ok(body.data.token, 'Expected JWT token');
    assert.ok(body.data.user, 'Expected user object');
    const decoded = jwt.verify(body.data.token, process.env.JWT_SECRET);
    assert.equal(decoded.sub, 2);
  });
});

// ── GET /api/progress ─────────────────────────────────────────────────────────

describe('GET /api/progress', () => {
  function makeToken(userId = 1) {
    return jwt.sign({ sub: userId, email: 'user@example.com' }, process.env.JWT_SECRET);
  }

  test('returns 401 without Authorization header', async () => {
    const res = await new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}/api/progress`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        headers: { 'x-api-key': 'test-api-key-123' },
      };
      const req = http.request(options, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(res.status, 401);
    assert.ok(res.body.error);
  });

  test('returns 401 with invalid token', async () => {
    const { status, body } = await request('GET', '/api/progress', null, { Authorization: 'Bearer invalid.token.here' });
    assert.equal(status, 401);
    assert.ok(body.error);
  });

  test('returns progress entries for authenticated user', async () => {
    mockPool._nextResult = {
      rows: [
        { control_id: 'iso27001-5.1', status: 'completed', notes: 'Done', updated_at: new Date().toISOString() },
        { control_id: 'iso27001-5.2', status: 'in_progress', notes: '', updated_at: new Date().toISOString() },
      ],
    };
    const { status, body } = await request('GET', '/api/progress', null, { Authorization: `Bearer ${makeToken()}` });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 2);
    assert.equal(body.data[0].controlId, 'iso27001-5.1');
    assert.equal(body.data[0].status, 'completed');
  });
});

// ── PUT /api/progress/:controlId ──────────────────────────────────────────────

describe('PUT /api/progress/:controlId', () => {
  function makeToken(userId = 1) {
    return jwt.sign({ sub: userId, email: 'user@example.com' }, process.env.JWT_SECRET);
  }

  test('returns 401 without token', async () => {
    const res = await new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify({ status: 'completed' });
      const url = new URL(`${baseUrl}/api/progress/iso27001-5.1`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'x-api-key': 'test-api-key-123',
        },
      };
      const req = http.request(options, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
    assert.equal(res.status, 401);
  });

  test('returns 400 for invalid status value', async () => {
    const { status, body } = await request('PUT', '/api/progress/iso27001-5.1', { status: 'invalid-status' }, { Authorization: `Bearer ${makeToken()}` });
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  test('returns updated progress entry on success', async () => {
    const now = new Date().toISOString();
    mockPool._nextResult = {
      rows: [{ control_id: 'iso27001-5.1', status: 'completed', notes: 'All done', updated_at: now }],
    };
    const { status, body } = await request('PUT', '/api/progress/iso27001-5.1', { status: 'completed', notes: 'All done' }, { Authorization: `Bearer ${makeToken()}` });
    assert.equal(status, 200);
    assert.equal(body.data.controlId, 'iso27001-5.1');
    assert.equal(body.data.status, 'completed');
    assert.equal(body.data.notes, 'All done');
  });

  test('accepts all valid status values', async () => {
    for (const s of ['not_started', 'in_progress', 'completed']) {
      const now = new Date().toISOString();
      mockPool._nextResult = { rows: [{ control_id: 'iso27001-5.1', status: s, notes: '', updated_at: now }] };
      const { status } = await request('PUT', '/api/progress/iso27001-5.1', { status: s }, { Authorization: `Bearer ${makeToken()}` });
      assert.equal(status, 200, `Expected 200 for status="${s}"`);
    }
  });
});

// ── DELETE /api/progress/:controlId ──────────────────────────────────────────

describe('DELETE /api/progress/:controlId', () => {
  function makeToken(userId = 1) {
    return jwt.sign({ sub: userId, email: 'user@example.com' }, process.env.JWT_SECRET);
  }

  test('returns 401 without token', async () => {
    const res = await new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}/api/progress/iso27001-5.1`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'DELETE',
        headers: { 'x-api-key': 'test-api-key-123' },
      };
      const req = http.request(options, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(res.status, 401);
  });

  test('returns 204 on successful delete', async () => {
    mockPool._nextResult = { rows: [] };
    const res = await new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}/api/progress/iso27001-5.1`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'DELETE',
        headers: {
          'x-api-key': 'test-api-key-123',
          Authorization: `Bearer ${makeToken()}`,
        },
      };
      const req = http.request(options, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(res.status, 204);
  });
});
