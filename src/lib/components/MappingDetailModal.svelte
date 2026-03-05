<script>
	import Modal from '$lib/components/Modal.svelte';

	/**
	 * Reusable Control Mapping Detail modal.
	 * Renders the FROM ↔ connector ↔ TO visualisation for a deduplicated mapping entry.
	 *
	 * @type {{
	 *   open: boolean;
	 *   entry: { mapping: any; otherControl: any; fromRelationship: string; toRelationship: string; isAsymmetric: boolean; fromNotes?: string; toNotes?: string } | null;
	 *   fromControl: any;
	 *   fromFramework: any;
	 *   toFramework: any;
	 *   onclose: () => void;
	 * }}
	 */
	let { open, entry, fromControl, fromFramework, toFramework, onclose } = $props();

	const toControl = $derived(entry?.otherControl ?? null);
</script>

{#if entry && fromControl && toControl}
	<Modal {open} title="Control Mapping Detail" {onclose}>
		<!-- Visual: FROM box — connector — TO box -->
		<div class="flex flex-col sm:flex-row items-stretch gap-3">
			<!-- FROM control box -->
			<div class="flex-1 rounded-xl border p-4" style="border-color:{fromFramework?.color ?? '#6b7280'}40;background:{fromFramework?.color ?? '#6b7280'}08">
				<p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:{fromFramework?.color ?? '#6b7280'}">From {fromFramework?.shortName ?? ''}</p>
				<p class="font-mono font-bold mt-2 text-sm">{fromControl.ref}</p>
				<p class="font-semibold mt-0.5 text-sm">{fromControl.title}</p>
				{#if fromControl.description}<p class="text-gray-600 dark:text-gray-400 mt-2 text-xs leading-relaxed">{fromControl.description}</p>{/if}
				<div class="flex flex-wrap gap-1 mt-3">
					{#if fromControl.theme}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{fromControl.theme}</span>{/if}
					{#if fromControl.category}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{fromControl.category}</span>{/if}
				</div>
				{#if entry.isAsymmetric && entry.fromNotes}
					<div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
						<p class="text-gray-700 dark:text-gray-300 text-sm">{entry.fromNotes}</p>
					</div>
				{/if}
			</div>

			<!-- Connector -->
			<div class="flex sm:flex-col items-center justify-center px-3 py-3 sm:py-0 sm:w-20 shrink-0 gap-4">
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5 conn-arrow-{entry.fromRelationship}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
					<span title="{entry.fromRelationship}" class="text-xl font-bold leading-none cursor-help conn-arrow-{entry.fromRelationship}">{entry.fromRelationship === 'equivalent' ? '≡' : '~'}</span>
					<svg class="w-5 h-5 conn-arrow-{entry.fromRelationship}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
				</div>
				{#if entry.isAsymmetric}
					<div class="flex items-center gap-2">
						<svg class="w-5 h-5 conn-arrow-{entry.toRelationship}" style="transform:rotate(180deg)" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
						<span title="{entry.toRelationship}" class="text-xl font-bold leading-none cursor-help conn-arrow-{entry.toRelationship}">{entry.toRelationship === 'equivalent' ? '≡' : '~'}</span>
						<svg class="w-5 h-5 conn-arrow-{entry.toRelationship}" style="transform:rotate(180deg)" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
					</div>
				{/if}
			</div>

			<!-- TO control box -->
			<div class="flex-1 rounded-xl border p-4" style="border-color:{toFramework?.color ?? '#6b7280'}40;background:{toFramework?.color ?? '#6b7280'}08">
				<p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:{toFramework?.color ?? '#6b7280'}">To {toFramework?.shortName ?? ''}</p>
				<p class="font-mono font-bold mt-2 text-sm">{toControl.ref}</p>
				<p class="font-semibold mt-0.5 text-sm">{toControl.title}</p>
				{#if toControl.description}<p class="text-gray-600 dark:text-gray-400 mt-2 text-xs leading-relaxed">{toControl.description}</p>{/if}
				<div class="flex flex-wrap gap-1 mt-3">
					{#if toControl.theme}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{toControl.theme}</span>{/if}
					{#if toControl.category}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{toControl.category}</span>{/if}
				</div>
				{#if entry.isAsymmetric && entry.toNotes}
					<div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
						<p class="text-gray-700 dark:text-gray-300 text-sm">{entry.toNotes}</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Rationale (symmetric) -->
		{#if !entry.isAsymmetric && entry.mapping?.notes}
			<div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
				<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
				<p class="text-gray-700 dark:text-gray-300">{entry.mapping.notes}</p>
			</div>
		{/if}
	</Modal>
{/if}
