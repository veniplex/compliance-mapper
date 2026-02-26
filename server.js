'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Data loading ──────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data');

function loadJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
}

const frameworks = loadJSON('frameworks.json');
const controlsData = loadJSON('controls.json');
const mappings = loadJSON('mappings.json');

// Flatten controls into a single lookup map keyed by control id
const controlsById = {};
for (const controls of Object.values(controlsData)) {
  for (const control of controls) {
    controlsById[control.id] = control;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS headers (allow embedding / external API usage)
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ── API routes ────────────────────────────────────────────────────────────────

const router = express.Router();

/**
 * GET /api/frameworks
 * Returns the list of all supported compliance frameworks.
 */
router.get('/frameworks', (_req, res) => {
  res.json({ data: frameworks });
});

/**
 * GET /api/frameworks/:id
 * Returns a single framework by its id.
 */
router.get('/frameworks/:id', (req, res) => {
  const framework = frameworks.find(f => f.id === req.params.id);
  if (!framework) {
    return res.status(404).json({ error: `Framework '${req.params.id}' not found.` });
  }
  res.json({ data: framework });
});

/**
 * GET /api/frameworks/:id/controls
 * Returns all controls for a given framework.
 */
router.get('/frameworks/:id/controls', (req, res) => {
  const { id } = req.params;
  const framework = frameworks.find(f => f.id === id);
  if (!framework) {
    return res.status(404).json({ error: `Framework '${id}' not found.` });
  }
  const controls = controlsData[id] || [];
  res.json({ data: controls });
});

/**
 * GET /api/controls
 * Returns all controls across all frameworks. Supports optional ?framework= filter.
 */
router.get('/controls', (req, res) => {
  const { framework } = req.query;
  if (framework) {
    const fw = frameworks.find(f => f.id === framework);
    if (!fw) {
      return res.status(404).json({ error: `Framework '${framework}' not found.` });
    }
    return res.json({ data: controlsData[framework] || [] });
  }
  const allControls = Object.values(controlsData).flat();
  res.json({ data: allControls });
});

/**
 * GET /api/controls/:id
 * Returns a single control by its id.
 */
router.get('/controls/:id', (req, res) => {
  const control = controlsById[req.params.id];
  if (!control) {
    return res.status(404).json({ error: `Control '${req.params.id}' not found.` });
  }
  res.json({ data: control });
});

/**
 * GET /api/mappings
 * Returns control mappings. Supports optional query parameters:
 *   ?from=<frameworkId>   – filter by source framework
 *   ?to=<frameworkId>     – filter by target framework
 *   ?control=<controlId>  – filter mappings that include a specific control (as source OR target)
 *   ?relationship=<type>  – filter by relationship type (equivalent | related)
 */
router.get('/mappings', (req, res) => {
  const { from, to, control, relationship } = req.query;

  // Validate framework ids when provided
  if (from && !frameworks.find(f => f.id === from)) {
    return res.status(400).json({ error: `Unknown framework '${from}'.` });
  }
  if (to && !frameworks.find(f => f.id === to)) {
    return res.status(400).json({ error: `Unknown framework '${to}'.` });
  }

  let results = mappings;

  if (from) {
    results = results.filter(m => {
      const src = controlsById[m.sourceControlId];
      return src && src.frameworkId === from;
    });
  }
  if (to) {
    results = results.filter(m => {
      const tgt = controlsById[m.targetControlId];
      return tgt && tgt.frameworkId === to;
    });
  }
  if (control) {
    results = results.filter(
      m => m.sourceControlId === control || m.targetControlId === control
    );
  }
  if (relationship) {
    results = results.filter(m => m.relationship === relationship);
  }

  // Enrich each mapping with full control objects for convenience
  const enriched = results.map(m => ({
    ...m,
    sourceControl: controlsById[m.sourceControlId] || null,
    targetControl: controlsById[m.targetControlId] || null,
  }));

  res.json({ data: enriched });
});

/**
 * GET /api/mappings/:id
 * Returns a single mapping by its id, enriched with full control objects.
 */
router.get('/mappings/:id', (req, res) => {
  const mapping = mappings.find(m => m.id === req.params.id);
  if (!mapping) {
    return res.status(404).json({ error: `Mapping '${req.params.id}' not found.` });
  }
  res.json({
    data: {
      ...mapping,
      sourceControl: controlsById[mapping.sourceControlId] || null,
      targetControl: controlsById[mapping.targetControlId] || null,
    },
  });
});

/**
 * GET /api/themes
 * Returns unique themes available across all controls, optionally filtered by ?framework=.
 */
router.get('/themes', (req, res) => {
  const { framework } = req.query;
  let controls;
  if (framework) {
    controls = controlsData[framework] || [];
  } else {
    controls = Object.values(controlsData).flat();
  }
  const themes = [...new Set(controls.map(c => c.theme))].sort();
  res.json({ data: themes });
});

app.use('/api', router);

// ── 404 handler for unknown API routes ────────────────────────────────────────

app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Serve the SPA for all other routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──────────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Compliance Mapper running at http://localhost:${PORT}`);
  });
}

module.exports = app;
