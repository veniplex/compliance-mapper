/**
 * Global modal stack for nested-modal browser-back support.
 *
 * Each open Modal registers a "close me" callback here. A single global
 * `popstate` listener pops and invokes only the topmost handler, so that
 * pressing browser-back closes only the most-recently-opened modal and leaves
 * any modal underneath it intact.
 *
 * When a modal is explicitly closed (X button / ESC / overlay) it calls
 * `history.back()` to remove the history entry it pushed. That `popstate`
 * event must NOT trigger the next modal's close handler, so we set
 * `skipNextPopstate = true` before calling `history.back()`.
 */

/** @type {Array<() => void>} */
const stack = [];
let skipNextPopstate = false;

function handleGlobalPopstate() {
	if (skipNextPopstate) {
		skipNextPopstate = false;
		return;
	}
	// Close only the topmost modal.
	const handler = stack.pop();
	if (handler) handler();
	if (stack.length === 0) {
		window.removeEventListener('popstate', handleGlobalPopstate);
	}
}

/**
 * Register a modal as "open". Pushes a history entry and adds the modal's
 * close callback to the global stack.
 * @param {() => void} closeFn - called when browser-back is pressed while this modal is on top
 */
export function modalOpen(closeFn) {
	if (typeof window === 'undefined') return;
	if (stack.length === 0) {
		window.addEventListener('popstate', handleGlobalPopstate);
	}
	history.pushState({ modal: true }, '');
	stack.push(closeFn);
}

/**
 * Deregister an explicitly-closed modal (X / ESC / overlay click).
 * Removes from the stack and calls `history.back()` to clean up the history
 * entry, suppressing the resulting `popstate` so other modals are unaffected.
 * @param {() => void} closeFn
 */
export function modalExplicitClose(closeFn) {
	if (typeof window === 'undefined') return;
	const idx = stack.indexOf(closeFn);
	if (idx !== -1) stack.splice(idx, 1);
	// Suppress the popstate that history.back() is about to fire.
	skipNextPopstate = true;
	history.back();
	if (stack.length === 0) {
		window.removeEventListener('popstate', handleGlobalPopstate);
	}
}

/**
 * Deregister a modal that is being destroyed by SvelteKit navigation
 * (not by an explicit close). Does NOT call `history.back()`.
 * @param {() => void} closeFn
 */
export function modalDestroy(closeFn) {
	if (typeof window === 'undefined') return;
	const idx = stack.indexOf(closeFn);
	if (idx !== -1) stack.splice(idx, 1);
	if (stack.length === 0) {
		window.removeEventListener('popstate', handleGlobalPopstate);
	}
}
