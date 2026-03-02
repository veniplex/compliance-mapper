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

/**
 * Given a deduplicated mapping entry (from getDeduplicatedMappings), return
 * the "from" control — the one that is NOT the otherControl.
 */
export function getFromControl(entry) {
	return entry.mapping.sourceControl?.id === entry.otherControl?.id
		? entry.mapping.targetControl
		: entry.mapping.sourceControl;
}

/**
 * Deduplicate bidirectional mappings for a given control.
 *
 * The raw data contains separate mapping records for each direction (A→B and B→A).
 * This function collapses them into one canonical entry per unique "other control",
 * always orienting from the perspective of `currentControlId`:
 *
 *  - `fromRelationship`  what this control implies about the other (current → other)
 *  - `toRelationship`    what the other implies about this control (other → current)
 *                         null when it is the same as `fromRelationship` (symmetric)
 *  - `isAsymmetric`      true when `fromRelationship !== toRelationship`
 *  - `mapping`           the canonical mapping object (current as source where possible)
 *  - `otherControl`      the control on the other side
 *
 * @param {Array} allMappings - All enriched mappings from the store
 * @param {string} currentControlId - The control whose perspective we adopt
 * @param {string} [filterFwId] - Optional: only return entries targeting this framework
 */
export function getDeduplicatedMappings(allMappings, currentControlId, filterFwId) {
	/** @type {Map<string, {fwd: any, rev: any}>} keyed by otherControlId */
	const byOtherControl = new Map();

	for (const m of allMappings) {
		const isSource = m.sourceControl?.id === currentControlId;
		const isTarget = m.targetControl?.id === currentControlId;
		if (!isSource && !isTarget) continue;

		const other = isSource ? m.targetControl : m.sourceControl;
		if (!other) continue;
		if (filterFwId && other.frameworkId !== filterFwId) continue;

		const entry = byOtherControl.get(other.id) ?? {};
		if (isSource) entry.fwd = m;   // current → other
		else entry.rev = m;            // other → current
		byOtherControl.set(other.id, entry);
	}

	const results = [];
	for (const [, entry] of byOtherControl) {
		// Pick canonical mapping (prefer the one where current control is source)
		const canonical = entry.fwd ?? entry.rev;
		const other = canonical.sourceControl?.id === currentControlId
			? canonical.targetControl
			: canonical.sourceControl;

		const fromRel = entry.fwd?.relationship ?? entry.rev?.relationship;
		// toRel: the reverse direction's relationship (falls back to fromRel when only one direction exists,
		// meaning the mapping is treated as symmetric for single-direction-only records)
		const toRel   = entry.rev?.relationship ?? entry.fwd?.relationship;
		const isAsymmetric = fromRel !== toRel;

		results.push({
			mapping: canonical,
			otherControl: other,
			fromRelationship: fromRel,   // current → other
			toRelationship: toRel,       // other → current
			isAsymmetric,
		});
	}
	return results;
}
