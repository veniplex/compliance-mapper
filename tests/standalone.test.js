// Must be set before the handler module is loaded so STANDALONE_MODE is picked up.
process.env.STANDALONE_MODE = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handler } from '../build/handler.js';

let server;
let baseUrl;

before(() => new Promise(resolve => {
  server = http.createServer(handler);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
    resolve();
  });
}));

after(() => new Promise(resolve => {
  server.close(() => {
    delete process.env.STANDALONE_MODE;
    resolve();
  });
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
  test('POST /api/auth/login returns 503', async () => {
    const res = await new Promise((resolve, reject) => {
      const payload = JSON.stringify({ email: 'a@b.com', password: 'password' });
      const url = new URL(`${baseUrl}/api/auth/login`);
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
