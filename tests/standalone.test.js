'use strict';

// Must be set before the server module is loaded so STANDALONE_MODE is picked up.
process.env.STANDALONE_MODE = 'true';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

// Load a fresh copy of the server with STANDALONE_MODE=true
delete require.cache[path.resolve(__dirname, '../server.js')];
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
  // Restore so subsequent test files are not affected
  delete process.env.STANDALONE_MODE;
}));

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
    http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET' },
      res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      }
    ).on('error', reject).end();
  });
}

describe('GET /api/config in standalone mode', () => {
  test('returns dbEnabled: false when STANDALONE_MODE=true', async () => {
    const { status, body } = await get('/api/config');
    assert.equal(status, 200);
    assert.equal(body.data.dbEnabled, false);
  });
});

describe('Auth routes in standalone mode', () => {
  test('POST /api/auth/signin returns 503', async () => {
    const res = await new Promise((resolve, reject) => {
      const payload = JSON.stringify({ email: 'a@b.com', password: 'password' });
      const url = new URL(`${baseUrl}/api/auth/signin`);
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        },
        r => {
          let body = '';
          r.setEncoding('utf8');
          r.on('data', c => { body += c; });
          r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(body) }));
        }
      ).on('error', reject);
      req.write(payload);
      req.end();
    });
    assert.equal(res.status, 503);
    assert.ok(res.body.error);
  });
});
