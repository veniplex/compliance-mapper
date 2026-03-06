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
  server.close(resolve);
}));

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
    const merged = { ...headers };
    const filteredHeaders = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined)
    );
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: filteredHeaders,
    };
    http.request(options, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
      });
    }).on('error', reject).end();
  });
}

describe('GET /api/frameworks', () => {
  test('returns an array of frameworks', async () => {
    const { status, body } = await get('/api/frameworks');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 9, 'Expected at least 9 frameworks');
  });

  test('each framework has required fields', async () => {
    const { body } = await get('/api/frameworks');
    for (const fw of body.data) {
      assert.ok(fw.id, 'Missing id');
      assert.ok(fw.name, 'Missing name');
      assert.ok(fw.shortName, 'Missing shortName');
      assert.ok(fw.description, 'Missing description');
      assert.ok(fw.businessImpact, `Missing businessImpact on ${fw.id}`);
      assert.ok(fw.structure, `Missing structure on ${fw.id}`);
      assert.ok(Array.isArray(fw.businessImpact), `businessImpact should be an array on ${fw.id}`);
      assert.ok(Array.isArray(fw.structure), `structure should be an array on ${fw.id}`);
      assert.ok(fw.businessImpact.length > 0, `businessImpact should not be empty on ${fw.id}`);
      assert.ok(fw.structure.length > 0, `structure should not be empty on ${fw.id}`);
      assert.ok(fw.lastUpdated, `Missing lastUpdated on ${fw.id}`);
      assert.ok(fw.url, `Missing url on ${fw.id}`);
      assert.ok(fw.version, `Missing version on ${fw.id}`);
    }
  });

  test('includes iso27001 and nis2', async () => {
    const { body } = await get('/api/frameworks');
    const ids = body.data.map(f => f.id);
    assert.ok(ids.includes('iso27001'));
    assert.ok(ids.includes('iso27001-2013'));
    assert.ok(ids.includes('nis2'));
    assert.ok(ids.includes('gdpr'));
    assert.ok(ids.includes('dora'));
    assert.ok(ids.includes('kritis'));
    assert.ok(ids.includes('nis2-umsg'));
    assert.ok(ids.includes('bsi-grundschutz'));
  });
});

describe('GET /api/frameworks/:id', () => {
  test('returns a single framework', async () => {
    const { status, body } = await get('/api/frameworks/iso27001');
    assert.equal(status, 200);
    assert.equal(body.data.id, 'iso27001');
    assert.ok(body.data.name.includes('27001'));
  });

  test('returns iso27001-2013 framework', async () => {
    const { status, body } = await get('/api/frameworks/iso27001-2013');
    assert.equal(status, 200);
    assert.equal(body.data.id, 'iso27001-2013');
    assert.ok(body.data.name.includes('2013'));
    assert.equal(body.data.version, '2013');
  });

  test('returns 404 for unknown framework', async () => {
    const { status, body } = await get('/api/frameworks/unknown-fw');
    assert.equal(status, 404);
    assert.ok(body.error);
  });

  test('returns kritis framework', async () => {
    const { status, body } = await get('/api/frameworks/kritis');
    assert.equal(status, 200);
    assert.equal(body.data.id, 'kritis');
    assert.equal(body.data.region, 'Germany');
  });

  test('returns nis2-umsg framework', async () => {
    const { status, body } = await get('/api/frameworks/nis2-umsg');
    assert.equal(status, 200);
    assert.equal(body.data.id, 'nis2-umsg');
    assert.equal(body.data.region, 'Germany');
  });

  test('returns bsi-grundschutz framework', async () => {
    const { status, body } = await get('/api/frameworks/bsi-grundschutz');
    assert.equal(status, 200);
    assert.equal(body.data.id, 'bsi-grundschutz');
    assert.equal(body.data.region, 'Germany');
  });
});

describe('GET /api/frameworks/:id/controls', () => {
  test('returns controls for iso27001', async () => {
    const { status, body } = await get('/api/frameworks/iso27001/controls');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  test('returns controls for iso27001-2013', async () => {
    const { status, body } = await get('/api/frameworks/iso27001-2013/controls');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 114, 'Expected all 114 ISO 27001:2013 controls');
    assert.ok(body.data.every(c => c.frameworkId === 'iso27001-2013'));
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

  test('returns controls for kritis', async () => {
    const { status, body } = await get('/api/frameworks/kritis/controls');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 11, 'Expected at least 11 KRITIS controls');
    assert.ok(body.data.every(c => c.frameworkId === 'kritis'));
  });

  test('returns controls for nis2-umsg', async () => {
    const { status, body } = await get('/api/frameworks/nis2-umsg/controls');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 13, 'Expected at least 13 NIS2UmsuCG controls');
    assert.ok(body.data.every(c => c.frameworkId === 'nis2-umsg'));
  });

  test('returns controls for bsi-grundschutz', async () => {
    const { status, body } = await get('/api/frameworks/bsi-grundschutz/controls');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 27, 'Expected at least 27 BSI Grundschutz controls');
    assert.ok(body.data.every(c => c.frameworkId === 'bsi-grundschutz'));
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

  test('from=iso27001-2013 filter returns mappings to iso27001', async () => {
    const { body } = await get('/api/mappings?from=iso27001-2013&to=iso27001');
    assert.ok(body.data.length > 0);
    for (const m of body.data) {
      assert.equal(m.sourceControl.frameworkId, 'iso27001-2013');
      assert.equal(m.targetControl.frameworkId, 'iso27001');
    }
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

  test('kritis to iso27001 mappings exist', async () => {
    const { body } = await get('/api/mappings?from=kritis&to=iso27001');
    assert.ok(body.data.length > 0, 'Expected mappings from kritis to iso27001');
    assert.ok(body.data.every(m => m.sourceControl.frameworkId === 'kritis'));
  });

  test('bsi-grundschutz to iso27001 mappings exist', async () => {
    const { body } = await get('/api/mappings?from=bsi-grundschutz&to=iso27001');
    assert.ok(body.data.length > 0, 'Expected mappings from bsi-grundschutz to iso27001');
  });

  test('nis2-umsg to nis2 mappings exist', async () => {
    const { body } = await get('/api/mappings?from=nis2-umsg&to=nis2');
    assert.ok(body.data.length > 0, 'Expected mappings from nis2-umsg to nis2');
  });

  test('iso27001-2013 to bsi-grundschutz mappings exist', async () => {
    const { body } = await get('/api/mappings?from=iso27001-2013&to=bsi-grundschutz');
    assert.ok(body.data.length > 0, 'Expected mappings from iso27001-2013 to bsi-grundschutz');
  });

  test('cis to nistcsf mappings exist', async () => {
    const { body } = await get('/api/mappings?from=cis&to=nistcsf');
    assert.ok(body.data.length > 0, 'Expected mappings from cis to nistcsf');
  });

  test('all framework pairs have at least one mapping in each direction', async () => {
    const { body: fwBody } = await get('/api/frameworks');
    const frameworkIds = fwBody.data.map(f => f.id);
    for (const src of frameworkIds) {
      for (const tgt of frameworkIds) {
        if (src === tgt) continue;
        const { body } = await get(`/api/mappings?from=${src}&to=${tgt}`);
        assert.ok(
          body.data.length > 0,
          `Expected at least one mapping from '${src}' to '${tgt}' but found none`
        );
      }
    }
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

describe('GET /api/stats', () => {
  test('returns summary statistics', async () => {
    const { status, body } = await get('/api/stats');
    assert.equal(status, 200);
    const s = body.data;
    assert.ok(typeof s.frameworkCount === 'number', 'Missing frameworkCount');
    assert.ok(typeof s.controlCount === 'number', 'Missing controlCount');
    assert.ok(typeof s.mappingCount === 'number', 'Missing mappingCount');
    assert.ok(s.frameworkCount >= 9, 'Expected at least 9 frameworks');
    assert.ok(s.controlCount > 50, 'Expected many controls');
    assert.ok(s.mappingCount >= 50, 'Expected at least 50 mappings');
  });

  test('controlsByFramework contains iso27001 and nis2', async () => {
    const { body } = await get('/api/stats');
    const cbf = body.data.controlsByFramework;
    assert.ok(typeof cbf.iso27001 === 'number', 'Missing iso27001 key');
    assert.ok(typeof cbf.nis2 === 'number', 'Missing nis2 key');
  });

  test('mappingsByRelationship counts sum to mappingCount', async () => {
    const { body } = await get('/api/stats');
    const mbr = body.data.mappingsByRelationship;
    assert.ok(typeof mbr.equivalent === 'number', 'Missing equivalent count');
    assert.ok(typeof mbr.related === 'number', 'Missing related count');
    const total = Object.values(mbr).reduce((sum, n) => sum + n, 0);
    assert.equal(total, body.data.mappingCount);
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

describe('API key authentication', () => {
  test('API is accessible without API key', async () => {
    const { status } = await get('/api/frameworks');
    assert.equal(status, 200);
  });
});

describe('GET /api/config', () => {
  test('returns dbEnabled flag', async () => {
    const { status, body } = await get('/api/config');
    assert.equal(status, 200);
    assert.ok(typeof body.data.dbEnabled === 'boolean');
  });

  test('does not require an API key', async () => {
    const { status, body } = await get('/api/config');
    assert.equal(status, 200);
    assert.ok(typeof body.data.dbEnabled === 'boolean');
  });
});
