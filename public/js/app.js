'use strict';

/* ── State ─────────────────────────────────────────────────────────── */
const state = {
  frameworks: [],
  mappings: [],
  filtered: [],
  themes: [],
  currentView: 'mapper',
};

/* ── API helpers ────────────────────────────────────────────────────── */
async function apiFetch(path) {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data;
}

/* ── Theme (dark / light mode) ──────────────────────────────────────── */
function initTheme() {
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark');
    document.getElementById('theme-icon').textContent = '☀️';
  }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

/* ── Navigation ─────────────────────────────────────────────────────── */
function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${viewId}`).classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });

  state.currentView = viewId;
  document.getElementById('mobile-menu').classList.add('hidden');
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('hidden');
});

/* ── Framework colour helpers ────────────────────────────────────────── */
function fwColor(fw) {
  return fw ? fw.color : '#6b7280';
}

function fwBadge(fw) {
  if (!fw) return '';
  const color = fw.color;
  return `<span class="fw-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${escHtml(fw.shortName)}</span>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Populate selects ────────────────────────────────────────────────── */
function populateFrameworkSelects(frameworks) {
  ['select-from', 'select-to'].forEach(id => {
    const sel = document.getElementById(id);
    frameworks.forEach(fw => {
      const opt = document.createElement('option');
      opt.value = fw.id;
      opt.textContent = `${fw.shortName} — ${fw.name}`;
      sel.appendChild(opt);
    });
  });
}

function populateThemeSelect(themes) {
  const sel = document.getElementById('select-theme');
  themes.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

/* ── Apply filters ───────────────────────────────────────────────────── */
function applyFilters() {
  const from = document.getElementById('select-from').value;
  const to = document.getElementById('select-to').value;
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  const rel = document.getElementById('select-relationship').value;
  const theme = document.getElementById('select-theme').value;

  state.filtered = state.mappings.filter(m => {
    const src = m.sourceControl;
    const tgt = m.targetControl;

    if (from && (!src || src.frameworkId !== from)) return false;
    if (to && (!tgt || tgt.frameworkId !== to)) return false;
    if (rel && m.relationship !== rel) return false;
    if (theme && src && src.theme !== theme && tgt && tgt.theme !== theme) return false;

    if (query) {
      const haystack = [
        src?.ref, src?.title, src?.description,
        tgt?.ref, tgt?.title, tgt?.description,
        m.notes,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  renderMappings();
}

/* ── Render mappings table ───────────────────────────────────────────── */
function renderMappings() {
  const tbody = document.getElementById('mappings-tbody');
  const count = state.filtered.length;
  document.getElementById('mapping-count').textContent = `${count} mapping${count !== 1 ? 's' : ''} found`;

  if (count === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-gray-400">No mappings match the current filters.</td></tr>`;
    return;
  }

  const fwMap = {};
  state.frameworks.forEach(fw => { fwMap[fw.id] = fw; });

  tbody.innerHTML = state.filtered.map(m => {
    const src = m.sourceControl;
    const tgt = m.targetControl;
    const srcFw = src ? fwMap[src.frameworkId] : null;
    const tgtFw = tgt ? fwMap[tgt.frameworkId] : null;
    const relClass = m.relationship === 'equivalent' ? 'equivalent' : 'related';
    const relLabel = m.relationship === 'equivalent' ? '≡ Equivalent' : '~ Related';

    return `<tr data-id="${escHtml(m.id)}" title="Click for details">
      <td class="px-4 py-3">
        <span class="rel-pill ${relClass}">${relLabel}</span>
      </td>
      <td class="px-4 py-3">
        <div class="control-cell">
          ${fwBadge(srcFw)}
          <div class="ref mt-1">${escHtml(src?.ref ?? '—')}</div>
          <div class="title text-gray-600 dark:text-gray-400">${escHtml(src?.title ?? '—')}</div>
        </div>
      </td>
      <td class="px-4 py-3">
        <div class="control-cell">
          ${fwBadge(tgtFw)}
          <div class="ref mt-1">${escHtml(tgt?.ref ?? '—')}</div>
          <div class="title text-gray-600 dark:text-gray-400">${escHtml(tgt?.title ?? '—')}</div>
        </div>
      </td>
      <td class="px-4 py-3 hidden lg:table-cell">
        <span class="text-xs text-gray-500 dark:text-gray-400">${escHtml(src?.theme ?? '')}</span>
      </td>
    </tr>`;
  }).join('');

  // Click row → open modal
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => openMappingModal(row.dataset.id));
  });
}

/* ── Modal ───────────────────────────────────────────────────────────── */
function openMappingModal(mappingId) {
  const m = state.mappings.find(x => x.id === mappingId);
  if (!m) return;

  const fwMap = {};
  state.frameworks.forEach(fw => { fwMap[fw.id] = fw; });
  const src = m.sourceControl;
  const tgt = m.targetControl;
  const srcFw = src ? fwMap[src.frameworkId] : null;
  const tgtFw = tgt ? fwMap[tgt.frameworkId] : null;

  document.getElementById('modal-title').textContent = 'Control Mapping Detail';
  document.getElementById('modal-body').innerHTML = `
    <div class="flex items-center gap-2 mb-2">
      <span class="rel-pill ${m.relationship}">${m.relationship === 'equivalent' ? '≡ Equivalent' : '~ Related'}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">ID: ${escHtml(m.id)}</span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      ${controlCard(src, srcFw, 'Source')}
      ${controlCard(tgt, tgtFw, 'Target')}
    </div>

    ${m.notes ? `<div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
      <p class="text-gray-700 dark:text-gray-300">${escHtml(m.notes)}</p>
    </div>` : ''}
  `;

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function controlCard(control, framework, label) {
  if (!control) return `<div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-4"><p class="text-gray-400">${label}: not found</p></div>`;
  const color = framework ? framework.color : '#6b7280';
  return `<div class="rounded-xl border p-4" style="border-color:${color}40;background:${color}08">
    <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:${color}">${escHtml(label)}</p>
    ${fwBadge(framework)}
    <p class="font-mono font-bold mt-2">${escHtml(control.ref)}</p>
    <p class="font-semibold mt-0.5">${escHtml(control.title)}</p>
    <p class="text-gray-600 dark:text-gray-400 mt-2 text-xs leading-relaxed">${escHtml(control.description)}</p>
    <div class="flex flex-wrap gap-1 mt-3">
      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${escHtml(control.theme)}</span>
      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${escHtml(control.category)}</span>
    </div>
  </div>`;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ── Frameworks page ─────────────────────────────────────────────────── */
function renderFrameworksPage(frameworks, controlsData, mappings) {
  const grid = document.getElementById('frameworks-grid');

  grid.innerHTML = frameworks.map(fw => {
    const controlCount = (controlsData[fw.id] || []).length;
    const mappingCount = mappings.filter(m => {
      const src = m.sourceControl;
      const tgt = m.targetControl;
      return (src && src.frameworkId === fw.id) || (tgt && tgt.frameworkId === fw.id);
    }).length;

    const typeColors = {
      Standard: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
      Regulation: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
      Framework: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
    };
    const typeClass = typeColors[fw.type] || '';

    return `<div class="fw-card border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="h-1.5" style="background:${fw.color}"></div>
      <div class="p-5">
        <div class="flex items-start justify-between gap-2 mb-3">
          <div>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${typeClass}">${escHtml(fw.type)}</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ml-1">${escHtml(fw.region)}</span>
          </div>
        </div>
        <h3 class="font-bold text-base leading-tight">${escHtml(fw.name)}</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">${escHtml(fw.version)}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">${escHtml(fw.description)}</p>
        <div class="mt-4 flex gap-3 text-xs">
          <span class="font-semibold">${controlCount} <span class="font-normal text-gray-500">controls</span></span>
          <span class="font-semibold">${mappingCount} <span class="font-normal text-gray-500">mappings</span></span>
        </div>
        <a href="${escHtml(fw.url)}" target="_blank" rel="noopener noreferrer"
          class="mt-3 inline-block text-xs font-medium hover:underline"
          style="color:${fw.color}">Official source ↗</a>
      </div>
    </div>`;
  }).join('');
}

/* ── API Docs page ───────────────────────────────────────────────────── */
function renderApiDocs() {
  const base = `${window.location.origin}/api`;
  document.getElementById('api-base-url').textContent = base;

  const endpoints = [
    {
      method: 'GET',
      path: '/frameworks',
      desc: 'List all supported compliance frameworks.',
      params: [],
      example: '/frameworks',
    },
    {
      method: 'GET',
      path: '/frameworks/:id',
      desc: 'Get a single framework by its identifier.',
      params: [{ name: 'id', desc: 'Framework identifier (e.g. <code>iso27001</code>, <code>nis2</code>, <code>gdpr</code>, <code>dora</code>, <code>cis</code>, <code>nistcsf</code>).' }],
      example: '/frameworks/nis2',
    },
    {
      method: 'GET',
      path: '/frameworks/:id/controls',
      desc: 'List all controls for a specific framework.',
      params: [{ name: 'id', desc: 'Framework identifier.' }],
      example: '/frameworks/iso27001/controls',
    },
    {
      method: 'GET',
      path: '/controls',
      desc: 'List all controls across all frameworks.',
      params: [{ name: 'framework', desc: '(optional) Filter controls by framework id.' }],
      example: '/controls?framework=gdpr',
    },
    {
      method: 'GET',
      path: '/controls/:id',
      desc: 'Get a single control by its identifier.',
      params: [{ name: 'id', desc: 'Control identifier (e.g. <code>iso27001-5.15</code>).' }],
      example: '/controls/iso27001-5.15',
    },
    {
      method: 'GET',
      path: '/mappings',
      desc: 'List control mappings with optional filters. Results include enriched control objects.',
      params: [
        { name: 'from', desc: '(optional) Source framework id.' },
        { name: 'to', desc: '(optional) Target framework id.' },
        { name: 'control', desc: '(optional) Control id to find all mappings involving that control.' },
        { name: 'relationship', desc: '(optional) <code>equivalent</code> or <code>related</code>.' },
      ],
      example: '/mappings?from=iso27001&to=nis2',
    },
    {
      method: 'GET',
      path: '/mappings/:id',
      desc: 'Get a single mapping by its identifier, enriched with full control objects.',
      params: [{ name: 'id', desc: 'Mapping identifier (e.g. <code>map-001</code>).' }],
      example: '/mappings/map-001',
    },
    {
      method: 'GET',
      path: '/themes',
      desc: 'List all unique control themes (e.g. Governance, Incident Management).',
      params: [{ name: 'framework', desc: '(optional) Filter themes by framework id.' }],
      example: '/themes',
    },
  ];

  const base2 = window.location.origin + '/api';

  document.getElementById('api-endpoints').innerHTML = endpoints.map(ep => `
    <div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
        <span class="method-badge method-get">${ep.method}</span>
        <code class="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">${escHtml(ep.path)}</code>
      </div>
      <div class="px-5 py-4 space-y-3">
        <p class="text-sm text-gray-600 dark:text-gray-400">${ep.desc}</p>
        ${ep.params.length ? `<div class="space-y-1.5">
          ${ep.params.map(p => `<div class="flex gap-2 text-xs">
            <code class="font-mono font-semibold text-gray-700 dark:text-gray-300 w-24 shrink-0">${p.name}</code>
            <span class="text-gray-500 dark:text-gray-400">${p.desc}</span>
          </div>`).join('')}
        </div>` : ''}
        <div>
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Try it</p>
          <div class="flex gap-2">
            <input type="text" value="${escHtml(ep.example)}"
              class="try-input flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              data-base="${escHtml(base2)}" />
            <button class="try-btn px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition">Run</button>
          </div>
          <pre class="try-result hidden mt-2 rounded-lg bg-gray-950 dark:bg-black text-green-400 text-xs p-3 api-code"></pre>
        </div>
      </div>
    </div>
  `).join('');

  // Wire up "Run" buttons
  document.querySelectorAll('.try-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const container = btn.closest('.rounded-2xl');
      const input = container.querySelector('.try-input');
      const result = container.querySelector('.try-result');
      const path = input.value.trim();
      const base3 = input.dataset.base;
      result.classList.remove('hidden');
      result.textContent = 'Loading…';
      try {
        const res = await fetch(`${base3}${path}`);
        const json = await res.json();
        result.textContent = JSON.stringify(json, null, 2);
      } catch (err) {
        result.textContent = `Error: ${err.message}`;
      }
    });
  });
}

/* ── Bootstrap ───────────────────────────────────────────────────────── */
async function init() {
  initTheme();

  try {
    const [frameworks, mappings, themes] = await Promise.all([
      apiFetch('/frameworks'),
      apiFetch('/mappings'),
      apiFetch('/themes'),
    ]);

    state.frameworks = frameworks;
    state.mappings = mappings;
    state.filtered = mappings;
    state.themes = themes;

    // Populate UI
    populateFrameworkSelects(frameworks);
    populateThemeSelect(themes);

    // Load controls for framework page (keyed by fw id)
    const controlsDataPromises = frameworks.map(fw =>
      apiFetch(`/frameworks/${fw.id}/controls`).then(c => [fw.id, c])
    );
    const controlsEntries = await Promise.all(controlsDataPromises);
    const controlsData = Object.fromEntries(controlsEntries);

    renderMappings();
    renderFrameworksPage(frameworks, controlsData, mappings);
    renderApiDocs();

    // Hook up filter controls
    ['select-from', 'select-to', 'select-relationship', 'select-theme'].forEach(id => {
      document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('search-input').addEventListener('input', applyFilters);

    document.getElementById('clear-filters').addEventListener('click', () => {
      document.getElementById('select-from').value = '';
      document.getElementById('select-to').value = '';
      document.getElementById('select-relationship').value = '';
      document.getElementById('select-theme').value = '';
      document.getElementById('search-input').value = '';
      applyFilters();
    });

  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('mappings-tbody').innerHTML =
      `<tr><td colspan="4" class="text-center py-12 text-red-500">Failed to load data. Please refresh.</td></tr>`;
  }
}

init();
