'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Import the app (without starting the server)
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

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
      });
    }).on('error', reject);
  });
}

describe('GET /api/frameworks', () => {
  test('returns an array of frameworks', async () => {
    const { status, body } = await get('/api/frameworks');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 6, 'Expected at least 6 frameworks');
  });

  test('each framework has required fields', async () => {
    const { body } = await get('/api/frameworks');
    for (const fw of body.data) {
      assert.ok(fw.id, 'Missing id');
      assert.ok(fw.name, 'Missing name');
      assert.ok(fw.shortName, 'Missing shortName');
      assert.ok(fw.description, 'Missing description');
    }
  });

  test('includes iso27001 and nis2', async () => {
    const { body } = await get('/api/frameworks');
    const ids = body.data.map(f => f.id);
    assert.ok(ids.includes('iso27001'));
    assert.ok(ids.includes('nis2'));
    assert.ok(ids.includes('gdpr'));
    assert.ok(ids.includes('dora'));
  });
});

describe('GET /api/frameworks/:id', () => {
  test('returns a single framework', async () => {
    const { status, body } = await get('/api/frameworks/iso27001');
    assert.equal(status, 200);
    assert.equal(body.data.id, 'iso27001');
    assert.ok(body.data.name.includes('27001'));
  });

  test('returns 404 for unknown framework', async () => {
    const { status, body } = await get('/api/frameworks/unknown-fw');
    assert.equal(status, 404);
    assert.ok(body.error);
  });
});

describe('GET /api/frameworks/:id/controls', () => {
  test('returns controls for iso27001', async () => {
    const { status, body } = await get('/api/frameworks/iso27001/controls');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  test('controls have required fields', async () => {
    const { body } = await get('/api/frameworks/iso27001/controls');
    for (const c of body.data) {
      assert.ok(c.id, 'Missing id');
      assert.ok(c.ref, 'Missing ref');
      assert.ok(c.title, 'Missing title');
      assert.equal(c.frameworkId, 'iso27001');
    }
  });

  test('returns 404 for unknown framework', async () => {
    const { status } = await get('/api/frameworks/no-such/controls');
    assert.equal(status, 404);
  });
});

describe('GET /api/controls', () => {
  test('returns all controls when no filter', async () => {
    const { status, body } = await get('/api/controls');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 50, 'Expected many controls across all frameworks');
  });

  test('framework query param filters controls', async () => {
    const { body } = await get('/api/controls?framework=nis2');
    assert.ok(body.data.every(c => c.frameworkId === 'nis2'));
  });

  test('returns 404 for unknown framework filter', async () => {
    const { status } = await get('/api/controls?framework=nope');
    assert.equal(status, 404);
  });
});

describe('GET /api/controls/:id', () => {
  test('returns a specific control', async () => {
    const { status, body } = await get('/api/controls/iso27001-5.15');
    assert.equal(status, 200);
    assert.equal(body.data.id, 'iso27001-5.15');
    assert.ok(body.data.title.toLowerCase().includes('access'));
  });

  test('returns 404 for unknown control', async () => {
    const { status } = await get('/api/controls/does-not-exist');
    assert.equal(status, 404);
  });
});

describe('GET /api/mappings', () => {
  test('returns all mappings when no filter', async () => {
    const { status, body } = await get('/api/mappings');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 50, 'Expected at least 50 mappings');
  });

  test('each mapping is enriched with sourceControl and targetControl', async () => {
    const { body } = await get('/api/mappings');
    const m = body.data[0];
    assert.ok(m.id, 'Missing mapping id');
    assert.ok(m.sourceControl, 'Missing sourceControl');
    assert.ok(m.targetControl, 'Missing targetControl');
    assert.ok(m.relationship, 'Missing relationship');
  });

  test('from= filter works', async () => {
    const { body } = await get('/api/mappings?from=iso27001');
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every(m => m.sourceControl.frameworkId === 'iso27001'));
  });

  test('to= filter works', async () => {
    const { body } = await get('/api/mappings?to=nis2');
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every(m => m.targetControl.frameworkId === 'nis2'));
  });

  test('from= and to= combined filter works', async () => {
    const { body } = await get('/api/mappings?from=iso27001&to=nis2');
    assert.ok(body.data.length > 0);
    for (const m of body.data) {
      assert.equal(m.sourceControl.frameworkId, 'iso27001');
      assert.equal(m.targetControl.frameworkId, 'nis2');
    }
  });

  test('relationship= filter returns only equivalent', async () => {
    const { body } = await get('/api/mappings?relationship=equivalent');
    assert.ok(body.data.every(m => m.relationship === 'equivalent'));
  });

  test('relationship= filter returns only related', async () => {
    const { body } = await get('/api/mappings?relationship=related');
    assert.ok(body.data.every(m => m.relationship === 'related'));
  });

  test('control= filter finds mappings involving a control', async () => {
    const { body } = await get('/api/mappings?control=iso27001-5.15');
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every(m =>
      m.sourceControlId === 'iso27001-5.15' || m.targetControlId === 'iso27001-5.15'
    ));
  });

  test('returns 400 for unknown from= framework', async () => {
    const { status } = await get('/api/mappings?from=bad-framework');
    assert.equal(status, 400);
  });

  test('returns 400 for unknown to= framework', async () => {
    const { status } = await get('/api/mappings?to=bad-framework');
    assert.equal(status, 400);
  });
});

describe('GET /api/mappings/:id', () => {
  test('returns a specific mapping enriched', async () => {
    const { status, body } = await get('/api/mappings/map-001');
    assert.equal(status, 200);
    assert.equal(body.data.id, 'map-001');
    assert.ok(body.data.sourceControl);
    assert.ok(body.data.targetControl);
  });

  test('returns 404 for unknown mapping', async () => {
    const { status } = await get('/api/mappings/map-9999');
    assert.equal(status, 404);
  });
});

describe('GET /api/themes', () => {
  test('returns an array of theme strings', async () => {
    const { status, body } = await get('/api/themes');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.includes('Governance'));
    assert.ok(body.data.includes('Incident Management'));
  });

  test('framework= filter works', async () => {
    const { body } = await get('/api/themes?framework=iso27001');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });
});

describe('CORS headers', () => {
  test('includes CORS headers on API responses', async () => {
    const { headers } = await get('/api/frameworks');
    assert.equal(headers['access-control-allow-origin'], '*');
  });
});

describe('Unknown API route', () => {
  test('returns 404 JSON for unknown API path', async () => {
    const { status, body } = await get('/api/nonexistent-route');
    assert.equal(status, 404);
    assert.ok(body.error);
  });
});
