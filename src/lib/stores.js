import { writable, derived } from 'svelte/store';

/** Currently authenticated user */
export const user = writable(null);

/** JWT token */
export const token = writable(null);

/** All frameworks list */
export const frameworks = writable([]);

/** Controls keyed by frameworkId */
export const controlsData = writable({});

/** All mappings (enriched) */
export const mappings = writable([]);

/** Progress map: controlId → status */
export const progress = writable({});

/** Todo checks map: controlId → { todoIndex → boolean } */
export const todoChecks = writable({});

/** Whether the database/auth is enabled */
export const dbEnabled = writable(true);

/** Overall compliance score derived from progress */
export const overallScore = derived([controlsData, progress], ([$controlsData, $progress]) => {
	const allControls = Object.values($controlsData).flat();
	const total = allControls.length;
	if (total === 0) return 0;
	const completed = allControls.filter((c) => ($progress[c.id] || 'not_started') === 'completed').length;
	const inProgress = allControls.filter((c) => ($progress[c.id] || 'not_started') === 'in_progress').length;
	return Math.round(((completed + inProgress * 0.5) / total) * 100);
});

/** Initialise auth state from localStorage */
export function initAuthFromStorage() {
	if (typeof localStorage === 'undefined') return;
	try {
		const t = localStorage.getItem('auth_token');
		const u = JSON.parse(localStorage.getItem('auth_user') || 'null');
		if (t && u) {
			token.set(t);
			user.set(u);
		}
	} catch {
		/* ignore */
	}
}

export function persistAuth(t, u) {
	if (t && u) {
		localStorage.setItem('auth_token', t);
		localStorage.setItem('auth_user', JSON.stringify(u));
	} else {
		localStorage.removeItem('auth_token');
		localStorage.removeItem('auth_user');
	}
}

export function clearAuth() {
	user.set(null);
	token.set(null);
	progress.set({});
	todoChecks.set({});
	persistAuth(null, null);
}
