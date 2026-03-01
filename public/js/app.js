'use strict';

/* ── State ─────────────────────────────────────────────────────────── */
const state = {
  frameworks: [],
  mappings: [],
  controlsData: {},
  controlIndex: {},
  selectedFramework: null,
  currentView: 'frameworks',
  user: null,
  token: null,
  progress: {}, // controlId → 'not_started' | 'in_progress' | 'completed'
  dbEnabled: true, // set from /api/config; false hides sign in / sign up
};

/* ── API helpers ────────────────────────────────────────────────────── */
async function apiFetch(path) {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data;
}

async function authFetch(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(json.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
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

/* ── Auth ───────────────────────────────────────────────────────────── */

function getStoredAuth() {
  try {
    return {
      token: localStorage.getItem('auth_token') || null,
      user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
    };
  } catch { return { token: null, user: null }; }
}

function setStoredAuth(token, user) {
  if (token && user) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

function renderAuthArea() {
  const area = document.getElementById('auth-area');
  if (!area) return;
  if (!state.dbEnabled) {
    area.innerHTML = '';
    return;
  }
  if (state.user) {
    area.innerHTML = `
      <span class="hidden sm:block text-xs text-gray-500 dark:text-gray-400 truncate max-w-[9rem]">${escHtml(state.user.email)}</span>
      <button id="settings-btn" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Settings</button>
      <button id="signout-btn" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Sign Out</button>
    `;
    document.getElementById('settings-btn').addEventListener('click', () => openSettings());
    document.getElementById('signout-btn').addEventListener('click', () => handleLogout(true));
    const navBtn = document.getElementById('settings-nav-btn');
    if (navBtn) navBtn.style.display = '';
    const navBtnMobile = document.getElementById('settings-nav-btn-mobile');
    if (navBtnMobile) navBtnMobile.style.display = '';
  } else {
    area.innerHTML = `
      <button id="signin-btn" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Sign In</button>
      <button id="signup-btn" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">Sign Up</button>
    `;
    document.getElementById('signin-btn').addEventListener('click', () => openAuthModal('signin'));
    document.getElementById('signup-btn').addEventListener('click', () => openAuthModal('signup'));
    const navBtn = document.getElementById('settings-nav-btn');
    if (navBtn) navBtn.style.display = 'none';
    const navBtnMobile = document.getElementById('settings-nav-btn-mobile');
    if (navBtnMobile) navBtnMobile.style.display = 'none';
  }
}

let _authMode = 'signin';

function setAuthModalMode(mode) {
  _authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('auth-modal-title').textContent = isSignup ? 'Create Account' : 'Sign In';
  document.getElementById('auth-submit').textContent = isSignup ? 'Create Account' : 'Sign In';
  document.getElementById('auth-password-hint').classList.toggle('hidden', !isSignup);
  document.getElementById('auth-password').setAttribute('autocomplete', isSignup ? 'new-password' : 'current-password');
  const tabSignin = document.getElementById('auth-tab-signin');
  const tabSignup = document.getElementById('auth-tab-signup');
  const activeClasses = ['bg-white', 'dark:bg-gray-950', 'shadow-sm', 'text-gray-900', 'dark:text-gray-100'];
  const inactiveClasses = ['text-gray-500', 'dark:text-gray-400'];
  activeClasses.forEach(c => tabSignin.classList.toggle(c, !isSignup));
  inactiveClasses.forEach(c => tabSignin.classList.toggle(c, isSignup));
  activeClasses.forEach(c => tabSignup.classList.toggle(c, isSignup));
  inactiveClasses.forEach(c => tabSignup.classList.toggle(c, !isSignup));
}

function openAuthModal(mode) {
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  setAuthModalMode(mode);
  document.getElementById('auth-modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('auth-email').focus();
}

function closeAuthModal() {
  document.getElementById('auth-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  errorEl.classList.add('hidden');
  submitBtn.disabled = true;
  try {
    const endpoint = _authMode === 'signup' ? '/auth/register' : '/auth/login';
    const result = await authFetch('POST', endpoint, { email, password });
    state.token = result.token;
    state.user = result.user;
    setStoredAuth(result.token, result.user);
    closeAuthModal();
    renderAuthArea();
    await loadProgress();
    if (state.currentView === 'framework-controls' && state.selectedFramework) {
      renderFrameworkControls();
    }
  } catch (err) {
    errorEl.textContent = err.message || 'An error occurred. Please try again.';
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
  }
}

function handleLogout(rerenderView) {
  state.user = null;
  state.token = null;
  state.progress = {};
  setStoredAuth(null, null);
  renderAuthArea();
  updateAllProgressBadges();
  if (state.currentView === 'settings') showView('frameworks');
  else if (rerenderView && state.currentView === 'framework-controls' && state.selectedFramework) {
    renderFrameworkControls();
  }
}

function initAuth() {
  const { token, user } = getStoredAuth();
  if (token && user) {
    state.token = token;
    state.user = user;
  }
  renderAuthArea();
  if (!state.dbEnabled) return;
  document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('auth-modal-overlay')) closeAuthModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('auth-modal-overlay').classList.contains('hidden')) {
      closeAuthModal();
    }
  });
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
  document.getElementById('auth-tab-signin').addEventListener('click', () => setAuthModalMode('signin'));
  document.getElementById('auth-tab-signup').addEventListener('click', () => setAuthModalMode('signup'));
  initSettings();
}

function openSettings() {
  showView('settings');
  loadSettingsProfile();
  loadApiKeys();
}

/* ── Settings ───────────────────────────────────────────────────────── */

function initSettings() {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSettingsTab(btn.dataset.settingsTab));
  });
  switchSettingsTab('profile');

  document.getElementById('settings-profile-form').addEventListener('submit', handleProfileSave);
  document.getElementById('settings-password-form').addEventListener('submit', handlePasswordChange);

  document.getElementById('settings-create-apikey-btn').addEventListener('click', () => {
    document.getElementById('settings-new-apikey-form').classList.remove('hidden');
    document.getElementById('settings-apikey-reveal').classList.add('hidden');
    document.getElementById('settings-apikey-name').value = '';
    document.getElementById('settings-apikey-name').focus();
  });
  document.getElementById('settings-apikey-create-cancel').addEventListener('click', () => {
    document.getElementById('settings-new-apikey-form').classList.add('hidden');
  });
  document.getElementById('settings-apikey-create-confirm').addEventListener('click', handleCreateApiKey);
  document.getElementById('settings-apikey-copy').addEventListener('click', () => {
    const val = document.getElementById('settings-apikey-value').textContent;
    navigator.clipboard.writeText(val).catch(() => {});
  });
}

function switchSettingsTab(tab) {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    const active = btn.dataset.settingsTab === tab;
    btn.classList.toggle('border-blue-600', active);
    btn.classList.toggle('text-blue-600', active);
    btn.classList.toggle('dark:border-blue-400', active);
    btn.classList.toggle('dark:text-blue-400', active);
    btn.classList.toggle('border-transparent', !active);
    btn.classList.toggle('text-gray-500', !active);
    btn.classList.toggle('dark:text-gray-400', !active);
  });
  document.querySelectorAll('.settings-tab-content').forEach(el => {
    el.classList.toggle('hidden', !el.id.endsWith(tab));
  });
}

async function loadSettingsProfile() {
  try {
    const data = await authFetch('GET', '/settings/profile');
    document.getElementById('settings-username').value = data.username || '';
    document.getElementById('settings-email').value = data.email || '';
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

async function handleProfileSave(e) {
  e.preventDefault();
  const username = document.getElementById('settings-username').value.trim();
  const email = document.getElementById('settings-email').value.trim();
  const errEl = document.getElementById('settings-profile-error');
  const okEl = document.getElementById('settings-profile-success');
  const btn = document.getElementById('settings-profile-submit');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');
  btn.disabled = true;
  try {
    const payload = {};
    if (username) payload.username = username;
    if (email) payload.email = email;
    const data = await authFetch('PATCH', '/settings/profile', payload);
    state.user = { ...state.user, email: data.email, username: data.username };
    setStoredAuth(state.token, state.user);
    renderAuthArea();
    okEl.textContent = 'Profile updated successfully.';
    okEl.classList.remove('hidden');
  } catch (err) {
    errEl.textContent = err.message || 'Failed to update profile.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

async function handlePasswordChange(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('settings-current-password').value;
  const newPassword = document.getElementById('settings-new-password').value;
  const errEl = document.getElementById('settings-password-error');
  const okEl = document.getElementById('settings-password-success');
  const btn = document.getElementById('settings-password-submit');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');
  if (newPassword.length < 8) {
    errEl.textContent = 'New password must be at least 8 characters.';
    errEl.classList.remove('hidden');
    return;
  }
  btn.disabled = true;
  try {
    await authFetch('PATCH', '/settings/password', { currentPassword, newPassword });
    document.getElementById('settings-current-password').value = '';
    document.getElementById('settings-new-password').value = '';
    okEl.textContent = 'Password changed successfully.';
    okEl.classList.remove('hidden');
  } catch (err) {
    errEl.textContent = err.message || 'Failed to change password.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

async function loadApiKeys() {
  const listEl = document.getElementById('settings-apikeys-list');
  if (!listEl) return;
  try {
    const keys = await authFetch('GET', '/settings/apikeys');
    if (keys.length === 0) {
      listEl.innerHTML = '<p class="text-sm text-gray-400 py-4 text-center">No API keys yet. Create one to access the API programmatically.</p>';
      return;
    }
    listEl.innerHTML = keys.map(k => `
      <div class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm truncate">${escHtml(k.name || 'Unnamed key')}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">${escHtml(k.keyPrefix)}••••••••••••••</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Created ${escHtml(new Date(k.createdAt).toLocaleDateString())}${k.lastUsedAt ? ' · Last used ' + escHtml(new Date(k.lastUsedAt).toLocaleDateString()) : ''}</p>
        </div>
        <button class="delete-apikey-btn shrink-0 px-2 py-1 rounded border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition" data-key-id="${escHtml(String(k.id))}">Revoke</button>
      </div>
    `).join('');
    listEl.querySelectorAll('.delete-apikey-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteApiKey(btn.dataset.keyId));
    });
  } catch (err) {
    console.error('Failed to load API keys:', err);
    listEl.innerHTML = '<p class="text-sm text-red-500 py-4 text-center">Failed to load API keys.</p>';
  }
}

async function handleCreateApiKey() {
  const name = document.getElementById('settings-apikey-name').value.trim();
  const errEl = document.getElementById('settings-apikeys-error');
  const btn = document.getElementById('settings-apikey-create-confirm');
  errEl.classList.add('hidden');
  btn.disabled = true;
  try {
    const data = await authFetch('POST', '/settings/apikeys', { name });
    document.getElementById('settings-new-apikey-form').classList.add('hidden');
    document.getElementById('settings-apikey-value').textContent = data.key;
    document.getElementById('settings-apikey-reveal').classList.remove('hidden');
    await loadApiKeys();
  } catch (err) {
    errEl.textContent = err.message || 'Failed to create API key.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

async function handleDeleteApiKey(keyId) {
  const errEl = document.getElementById('settings-apikeys-error');
  errEl.classList.add('hidden');
  try {
    await authFetch('DELETE', `/settings/apikeys/${encodeURIComponent(keyId)}`);
    await loadApiKeys();
  } catch (err) {
    errEl.textContent = err.message || 'Failed to revoke API key.';
    errEl.classList.remove('hidden');
  }
}

/* ── Progress tracking ──────────────────────────────────────────────── */

const PROGRESS_CYCLE = ['not_started', 'in_progress', 'completed'];
const PROGRESS_LABELS = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' };
const PROGRESS_ICONS = { not_started: '○', in_progress: '◐', completed: '●' };
const PROGRESS_CLASSES = {
  not_started: 'progress-not-started',
  in_progress: 'progress-in-progress',
  completed: 'progress-completed',
};

async function loadProgress() {
  if (!state.token) return;
  try {
    const entries = await authFetch('GET', '/progress');
    state.progress = {};
    entries.forEach(e => { state.progress[e.controlId] = e.status; });
    updateAllProgressBadges();
  } catch (err) {
    if (err.status === 401) handleLogout(false);
  }
}

function progressBadgeHtml(controlId) {
  if (!state.user) return '';
  const status = state.progress[controlId] || 'not_started';
  const label = PROGRESS_LABELS[status];
  const icon = PROGRESS_ICONS[status];
  const cls = PROGRESS_CLASSES[status];
  return `<button class="progress-btn ${cls}" data-progress-id="${escHtml(controlId)}" aria-label="Progress: ${escHtml(label)}. Click to change." title="${escHtml(label)}">${icon}</button>`;
}

function updateAllProgressBadges() {
  document.querySelectorAll('[data-progress-id]').forEach(btn => {
    const cid = btn.dataset.progressId;
    const status = state.progress[cid] || 'not_started';
    btn.textContent = PROGRESS_ICONS[status];
    btn.className = `progress-btn ${PROGRESS_CLASSES[status]}`;
    btn.title = PROGRESS_LABELS[status];
    btn.setAttribute('aria-label', `Progress: ${PROGRESS_LABELS[status]}. Click to change.`);
  });
}

async function handleProgressClick(controlId) {
  const current = state.progress[controlId] || 'not_started';
  const next = PROGRESS_CYCLE[(PROGRESS_CYCLE.indexOf(current) + 1) % PROGRESS_CYCLE.length];
  state.progress[controlId] = next; // optimistic update
  updateAllProgressBadges();
  try {
    await authFetch('PUT', `/progress/${encodeURIComponent(controlId)}`, { status: next });
  } catch (err) {
    state.progress[controlId] = current; // revert
    updateAllProgressBadges();
    console.error('Failed to update progress:', err);
  }
}

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
  ['ctable-fw-select'].forEach(id => {
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

/* ── Stats banner ────────────────────────────────────────────────────── */
function renderStatsBanner(stats) {
  const banner = document.getElementById('fw-stats-banner');
  const items = [
    { label: 'Frameworks', value: stats.frameworkCount },
    { label: 'Controls', value: stats.controlCount },
    { label: 'Mappings', value: stats.mappingCount },
    ...Object.entries(stats.mappingsByRelationship || {}).map(([rel, count]) => ({
      label: rel.charAt(0).toUpperCase() + rel.slice(1),
      value: count,
    })),
  ];
  banner.innerHTML = items.map(item =>
    `<span class="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5">
      <span class="font-bold text-gray-800 dark:text-gray-200">${item.value}</span>
      <span class="text-gray-500 dark:text-gray-400">${escHtml(item.label)}</span>
    </span>`
  ).join('');
  banner.classList.remove('hidden');
}

/* ── Export CSV ──────────────────────────────────────────────────────── */
function exportCSV() {
  const fwMap = {};
  state.frameworks.forEach(fw => { fwMap[fw.id] = fw; });

  const header = ['Mapping ID', 'Relationship', 'Source Framework', 'Source Ref', 'Source Title', 'Target Framework', 'Target Ref', 'Target Title', 'Theme', 'Notes'];

  const rows = state.filtered.map(m => {
    const src = m.sourceControl;
    const tgt = m.targetControl;
    return [
      m.id,
      m.relationship,
      src ? (fwMap[src.frameworkId] ? fwMap[src.frameworkId].shortName : src.frameworkId) : '',
      src ? src.ref : '',
      src ? src.title : '',
      tgt ? (fwMap[tgt.frameworkId] ? fwMap[tgt.frameworkId].shortName : tgt.frameworkId) : '',
      tgt ? tgt.ref : '',
      tgt ? tgt.title : '',
      src ? src.theme : '',
      m.notes || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compliance-mappings.csv';
  a.click();
  URL.revokeObjectURL(url);
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

    return `<div class="fw-card border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer" data-fw-id="${escHtml(fw.id)}">
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
        <div class="mt-3 flex items-center justify-between">
          <a href="${escHtml(fw.url)}" target="_blank" rel="noopener noreferrer"
            class="text-xs font-medium hover:underline"
            style="color:${fw.color}" onclick="event.stopPropagation()">Official source ↗</a>
          <span class="text-xs text-gray-400 dark:text-gray-500">${fw.lastUpdated ? 'Updated ' + escHtml(fw.lastUpdated) : 'View controls →'}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  // Click card → show framework controls
  grid.querySelectorAll('.fw-card[data-fw-id]').forEach(card => {
    card.addEventListener('click', () => showFrameworkControls(card.dataset.fwId));
  });
}

/* ── Framework controls view ─────────────────────────────────────────── */
function showFrameworkControls(fwId) {
  state.selectedFramework = fwId;
  renderFrameworkControls();
  showView('framework-controls');
}

function renderFrameworkControls() {
  const fwId = state.selectedFramework;
  const fw = state.frameworks.find(f => f.id === fwId);
  const controls = state.controlsData[fwId] || [];

  const header = document.getElementById('fw-controls-header');
  header.innerHTML = `
    <div class="flex items-center gap-3 mb-2">
      <span class="fw-badge" style="background:${fw.color}20;color:${fw.color};border:1px solid ${fw.color}40">${escHtml(fw.shortName)}</span>
      <h1 class="text-2xl font-bold">${escHtml(fw.name)}</h1>
    </div>
    <div class="flex flex-wrap gap-3 text-xs mb-3">
      <span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
        Version: <strong class="ml-0.5 text-gray-700 dark:text-gray-300">${escHtml(fw.version)}</strong>
      </span>
      ${fw.lastUpdated ? `<span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        Last updated: <strong class="ml-0.5 text-gray-700 dark:text-gray-300">${escHtml(fw.lastUpdated)}</strong>
      </span>` : ''}
      <a href="${escHtml(fw.url)}" target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center gap-1 font-medium hover:underline"
        style="color:${fw.color}">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        Official source ↗
      </a>
    </div>
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${escHtml(fw.description)}</p>
    ${fw.businessImpact ? `<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Business Impact</h2>
      ${Array.isArray(fw.businessImpact)
        ? `<ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">${fw.businessImpact.map(pt => `<li>${escHtml(pt)}</li>`).join('')}</ul>`
        : `<p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">${escHtml(fw.businessImpact)}</p>`}
    </div>` : ''}
    ${fw.structure ? `<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-4">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Framework Structure</h2>
      ${Array.isArray(fw.structure)
        ? `<ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">${fw.structure.map(pt => `<li>${escHtml(pt)}</li>`).join('')}</ul>`
        : `<p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">${escHtml(fw.structure)}</p>`}
    </div>` : ''}
    <p class="text-xs text-gray-400 dark:text-gray-500">${controls.length} controls — click a control to see its cross-framework mappings</p>
  `;

  const list = document.getElementById('fw-controls-list');
  if (controls.length === 0) {
    list.innerHTML = '<p class="text-gray-400 text-center py-10">No controls found.</p>';
    return;
  }

  const groups = {};
  controls.forEach(c => {
    const g = c.category || 'Other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });

  list.innerHTML = Object.entries(groups).map(([cat, ctrls]) => `
    <div class="mb-6">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">${escHtml(cat)}</h3>
      <div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
        ${ctrls.map((c, i) => `
          <div class="control-row flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}" data-control-id="${escHtml(c.id)}">
            <div class="shrink-0 mt-0.5">
              <span class="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded" style="background:${fw.color}20;color:${fw.color}">${escHtml(c.ref)}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-sm">${escHtml(c.title)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">${escHtml(c.description)}</div>
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mt-1.5 inline-block">${escHtml(c.theme)}</span>
            </div>
            ${progressBadgeHtml(c.id)}
            <div class="shrink-0 self-center text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.control-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.progress-btn')) return;
      openControlMappingModal(row.dataset.controlId);
    });
    const progressBtn = row.querySelector('.progress-btn');
    if (progressBtn) {
      progressBtn.addEventListener('click', e => {
        e.stopPropagation();
        handleProgressClick(progressBtn.dataset.progressId);
      });
    }
  });
}

/* ── Control mapping modal ───────────────────────────────────────────── */
function openControlMappingModal(controlId) {
  const entry = state.controlIndex[controlId];
  if (!entry) return;
  const { control, framework: fw } = entry;

  const relatedMappings = state.mappings.filter(m =>
    (m.sourceControl && m.sourceControl.id === controlId) ||
    (m.targetControl && m.targetControl.id === controlId)
  );

  const otherFrameworks = state.frameworks.filter(f => f.id !== control.frameworkId);
  const fwMappings = {};
  relatedMappings.forEach(m => {
    const isSource = m.sourceControl && m.sourceControl.id === controlId;
    const otherControl = isSource ? m.targetControl : m.sourceControl;
    if (!otherControl) return;
    const ofwId = otherControl.frameworkId;
    if (!fwMappings[ofwId]) fwMappings[ofwId] = [];
    fwMappings[ofwId].push({ control: otherControl, relationship: m.relationship, mappingId: m.id });
  });

  const totalEquivalent = relatedMappings.filter(m => m.relationship === 'equivalent').length;
  const totalRelated = relatedMappings.filter(m => m.relationship === 'related').length;

  document.getElementById('modal-title').innerHTML =
    `<div class="flex items-center gap-2 flex-wrap">${fwBadge(fw)}<span class="font-mono font-bold">${escHtml(control.ref)}</span></div>` +
    `<div class="text-base font-semibold mt-0.5">${escHtml(control.title)}</div>`;

  document.getElementById('modal-body').innerHTML = `
    <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">${escHtml(control.description)}</p>
    <div class="flex flex-wrap gap-2 mt-1">
      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">${escHtml(control.theme)}</span>
      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">${escHtml(control.category)}</span>
    </div>

    <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
      <span class="font-semibold text-gray-700 dark:text-gray-300">${relatedMappings.length} mapping${relatedMappings.length !== 1 ? 's' : ''}</span>
      ${totalEquivalent > 0 ? `<span class="flex items-center gap-1.5"><span class="mapping-sym equivalent">≡</span>${totalEquivalent} equivalent</span>` : ''}
      ${totalRelated > 0 ? `<span class="flex items-center gap-1.5"><span class="mapping-sym related">~</span>${totalRelated} related</span>` : ''}
    </div>

    <div class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Framework</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mapped Control(s)</th>
            <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950">
          ${otherFrameworks.map(ofw => {
            const maps = fwMappings[ofw.id] || [];
            if (maps.length === 0) {
              return `<tr>
                <td class="px-3 py-2.5">${fwBadge(ofw)}</td>
                <td class="px-3 py-2.5 text-gray-400 text-xs">—</td>
                <td class="px-3 py-2.5 text-center"><span class="mapping-sym none">—</span></td>
              </tr>`;
            }
            return maps.map((mp, i) => `<tr class="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors" data-mapping-id="${escHtml(mp.mappingId)}">
              <td class="px-3 py-2.5">${i === 0 ? fwBadge(ofw) : ''}</td>
              <td class="px-3 py-2.5">
                <div class="font-mono font-semibold text-xs">${escHtml(mp.control.ref)}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${escHtml(mp.control.title)}</div>
              </td>
              <td class="px-3 py-2.5 text-center"><span class="mapping-sym ${mp.relationship}" title="${mp.relationship === 'equivalent' ? 'Equivalent' : 'Related'}">${mp.relationship === 'equivalent' ? '≡' : '~'}</span></td>
            </tr>`).join('');
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Wire up mapped-control rows via event delegation → open the mapping detail
  document.getElementById('modal-body').addEventListener('click', e => {
    const row = e.target.closest('tr[data-mapping-id]');
    if (row) openMappingModal(row.dataset.mappingId);
  });
}

/* ── Controls mapping table view ─────────────────────────────────────── */
function renderControlsTable(fwId) {
  const container = document.getElementById('ctable-container');

  if (!fwId) {
    container.innerHTML = '<p class="text-center text-gray-400 py-10">Select a framework above to view its controls and mappings.</p>';
    return;
  }

  const fw = state.frameworks.find(f => f.id === fwId);
  if (!fw) return;

  const controls = state.controlsData[fwId] || [];
  const otherFrameworks = state.frameworks.filter(f => f.id !== fwId);

  if (controls.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 py-10">No controls found for this framework.</p>';
    return;
  }

  // Build index: controlId → frameworkId → [{ mappingId, relationship, otherControl }]
  const controlMappingIndex = {};
  controls.forEach(c => { controlMappingIndex[c.id] = {}; });

  state.mappings.forEach(m => {
    const src = m.sourceControl;
    const tgt = m.targetControl;
    let controlId = null;
    let otherControl = null;

    if (src && src.frameworkId === fwId && controlMappingIndex[src.id] !== undefined) {
      controlId = src.id;
      otherControl = tgt;
    } else if (tgt && tgt.frameworkId === fwId && controlMappingIndex[tgt.id] !== undefined) {
      controlId = tgt.id;
      otherControl = src;
    }

    if (controlId && otherControl) {
      const ofwId = otherControl.frameworkId;
      if (!controlMappingIndex[controlId][ofwId]) controlMappingIndex[controlId][ofwId] = [];
      controlMappingIndex[controlId][ofwId].push({
        mappingId: m.id,
        relationship: m.relationship,
        otherControl,
      });
    }
  });

  const headerCells = otherFrameworks.map(ofw =>
    `<th class="px-2 py-3 text-center font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
      <span class="fw-badge" style="background:${ofw.color}20;color:${ofw.color};border:1px solid ${ofw.color}40">${escHtml(ofw.shortName)}</span>
    </th>`
  ).join('');

  const rows = controls.map(c => {
    const mappingCells = otherFrameworks.map(ofw => {
      const maps = controlMappingIndex[c.id][ofw.id] || [];
      if (maps.length === 0) {
        return `<td class="px-2 py-3 text-center"><span class="mapping-sym none" title="No mapping to ${escHtml(ofw.shortName)}">—</span></td>`;
      }
      const icons = maps.map(mp => {
        const label = `${mp.relationship === 'equivalent' ? 'Equivalent' : 'Related'}: ${mp.otherControl.ref} — ${mp.otherControl.title}`;
        return `<span class="mapping-sym ${escHtml(mp.relationship)} ctable-icon" tabindex="0" role="button"
          data-mapping-id="${escHtml(mp.mappingId)}"
          aria-label="${escHtml(label)}"
          title="${escHtml(label)}"
        >${mp.relationship === 'equivalent' ? '≡' : '~'}</span>`;
      }).join('');
      return `<td class="px-2 py-3 text-center">${icons}</td>`;
    }).join('');

    return `<tr>
      <td class="px-4 py-3 ctable-control-col">
        <div class="font-mono font-semibold text-xs" style="color:${fw.color}">${escHtml(c.ref)}</div>
        <div class="font-medium text-xs mt-0.5">${escHtml(c.title)}</div>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mt-1 inline-block">${escHtml(c.theme)}</span>
      </td>
      ${mappingCells}
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider ctable-control-col">Control</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody id="ctable-tbody" class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950">
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
    <p class="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
      <span class="mapping-sym equivalent" style="display:inline-flex">≡</span> Equivalent &nbsp;
      <span class="mapping-sym related" style="display:inline-flex">~</span> Related &nbsp;
      <span class="mapping-sym none" style="display:inline-flex">—</span> No mapping &nbsp;· Click an icon to view details
    </p>
  `;
}

/* ── API Docs page ───────────────────────────────────────────────────── */
function renderApiDocs() {
  const base = `${window.location.origin}/api`;
  document.getElementById('api-base-url').textContent = base;

  const endpoints = [
    {
      method: 'GET',
      path: '/stats',
      desc: 'Returns summary statistics about the dataset: framework count, total controls, total mappings, and per-relationship breakdowns.',
      params: [],
      example: '/stats',
    },
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
    const config = await apiFetch('/config');
    state.dbEnabled = config.dbEnabled === true;
  } catch {
    state.dbEnabled = true;
  }

  initAuth();

  try {
    const [frameworks, mappings, stats] = await Promise.all([
      apiFetch('/frameworks'),
      apiFetch('/mappings'),
      apiFetch('/stats'),
    ]);

    state.frameworks = frameworks;
    state.mappings = mappings;

    // Populate UI
    populateFrameworkSelects(frameworks);
    renderStatsBanner(stats);

    // Load controls for framework page (keyed by fw id)
    const controlsDataPromises = frameworks.map(fw =>
      apiFetch(`/frameworks/${fw.id}/controls`).then(c => [fw.id, c])
    );
    const controlsEntries = await Promise.all(controlsDataPromises);
    const controlsData = Object.fromEntries(controlsEntries);
    state.controlsData = controlsData;

    // Build O(1) control lookup: controlId → { control, framework }
    state.controlIndex = {};
    frameworks.forEach(fw => {
      (controlsData[fw.id] || []).forEach(c => {
        state.controlIndex[c.id] = { control: c, framework: fw };
      });
    });

    renderFrameworksPage(frameworks, controlsData, mappings);
    renderApiDocs();

    // Preselect ISO 27001:2022 in Controls Table
    const ctableSelect = document.getElementById('ctable-fw-select');
    if (state.controlsData['iso27001']) {
      ctableSelect.value = 'iso27001';
      renderControlsTable('iso27001');
    }

  // Click / keyboard handler on mapping icons (delegated, attached once)
  document.getElementById('ctable-container').addEventListener('click', e => {
    const icon = e.target.closest('[data-mapping-id]');
    if (icon) openMappingModal(icon.dataset.mappingId);
  });
  document.getElementById('ctable-container').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const icon = e.target.closest('[data-mapping-id]');
      if (icon) { e.preventDefault(); openMappingModal(icon.dataset.mappingId); }
    }
  });

  document.getElementById('fw-back-btn').addEventListener('click', () => showView('frameworks'));

    document.getElementById('ctable-fw-select').addEventListener('change', e => {
      renderControlsTable(e.target.value);
    });

    // Load progress if user is already authenticated
    if (state.token) await loadProgress();

  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('ctable-container').innerHTML =
      `<p class="text-center py-12 text-red-500">Failed to load data. Please refresh.</p>`;
  }
}

init();
