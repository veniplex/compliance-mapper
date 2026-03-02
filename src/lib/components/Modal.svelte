<script>
	import { onDestroy } from 'svelte';

	/**
	 * Generic modal dialog component.
	 * Accepts either a plain `title` string OR a `{#snippet title()}` for rich content.
	 * @type {{ open: boolean; title?: string | import('svelte').Snippet; onclose: () => void; children: import('svelte').Snippet }}
	 */
	let { open = false, title, onclose, children } = $props();

	// Track whether we pushed a history entry for this modal.
	let pushed = false;

	function handlePopstate() {
		// Browser back was pressed — close modal without going back again.
		pushed = false;
		onclose?.();
	}

	// Push/pop history state to make browser-back close the modal.
	$effect(() => {
		if (typeof window === 'undefined') return;
		if (open) {
			if (!pushed) {
				history.pushState({ modal: true }, '');
				pushed = true;
				window.addEventListener('popstate', handlePopstate);
			}
		} else {
			if (pushed) {
				pushed = false;
				window.removeEventListener('popstate', handlePopstate);
				history.back();
			}
		}
	});

	onDestroy(() => {
		if (pushed) {
			pushed = false;
			window.removeEventListener('popstate', handlePopstate);
			// Do NOT call history.back() here — component may be destroyed by navigation,
			// and going back would take the user to the wrong page.
		}
	});

	function handleOverlayClick(e) {
		if (e.target === e.currentTarget) onclose?.();
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') onclose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={handleOverlayClick}
	>
		<div
			class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700"
		>
			<div
				class="sticky top-0 flex items-start justify-between p-5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
			>
				<div class="font-bold text-lg pr-4 min-w-0 flex-1">
					{#if typeof title === 'string'}
						{title}
					{:else if title}
						{@render title()}
					{/if}
				</div>
				<button
					class="shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"
					aria-label="Close"
					onclick={onclose}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<div class="p-5 space-y-4 text-sm">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
