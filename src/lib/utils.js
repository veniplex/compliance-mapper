/**
 * Shared constants for progress tracking.
 */
export const PROGRESS_CYCLE = /** @type {const} */ (['not_started', 'in_progress', 'completed']);
export const PROGRESS_LABELS = {
	not_started: 'Not started',
	in_progress: 'In progress',
	completed: 'Completed',
};
export const PROGRESS_ICONS = { not_started: '○', in_progress: '◐', completed: '●' };
export const PROGRESS_CLASSES = {
	not_started: 'progress-not-started',
	in_progress: 'progress-in-progress',
	completed: 'progress-completed',
};

/** Donut chart constants */
export const DONUT_R = 38;
export const DONUT_CIRC = 2 * Math.PI * DONUT_R;
export const SCORE_HIGH = 70;
export const SCORE_MED = 40;
export const RING_COLOR_HIGH = '#22c55e';
export const RING_COLOR_MED = '#f59e0b';
export const RING_COLOR_LOW = '#ef4444';

export function scoreRingColor(score) {
	return score >= SCORE_HIGH ? RING_COLOR_HIGH : score >= SCORE_MED ? RING_COLOR_MED : RING_COLOR_LOW;
}

/** Escape HTML entities */
export function escHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** User preferences stored in localStorage */
export function getPreferences() {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem('preferences') || '{}');
	} catch {
		return {};
	}
}

export function setPreference(key, value) {
	const prefs = getPreferences();
	prefs[key] = value;
	localStorage.setItem('preferences', JSON.stringify(prefs));
}
