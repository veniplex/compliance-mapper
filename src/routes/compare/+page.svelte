<script>
	import { frameworks, controlsData, mappings } from '$lib/stores.js';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import ControlDetailModal from '$lib/components/ControlDetailModal.svelte';
	import { getDeduplicatedMappings } from '$lib/utils.js';
	import todosData from '../../../data/todos.json';

	let fwAId = $state('');
	let fwBId = $state('');
	let filterRelation = $state('all');

	// Control detail modal
	/** @type {any} */
	let detailControl = $state(null);
	let detailOpen = $state(false);

	function openControlDetail(control) {
		detailControl = control;
		detailOpen = true;
	}

	// Default to first two frameworks once loaded
	$effect(() => {
		if ($frameworks.length >= 2) {
			if (!fwAId) fwAId = $frameworks[0].id;
			if (!fwBId) fwBId = $frameworks[1].id;
		}
	});

	const fwA = $derived($frameworks.find((f) => f.id === fwAId) ?? null);
	const fwB = $derived($frameworks.find((f) => f.id === fwBId) ?? null);
	const controlsA = $derived(fwAId ? ($controlsData[fwAId] || []) : []);

	/** All deduplicated mapping pairs between fw A and fw B */
	const allPairs = $derived(() => {
		if (!fwAId || !fwBId || fwAId === fwBId) return [];
		const results = [];
		for (const ctrl of controlsA) {
			const entries = getDeduplicatedMappings($mappings, ctrl.id, fwBId);
			for (const entry of entries) {
				results.push({ leftControl: ctrl, entry });
			}
		}
		return results;
	});

	const filteredPairs = $derived(() => {
		const pairs = allPairs();
		if (filterRelation === 'all') return pairs;
		return pairs.filter((p) => p.entry.fromRelationship === filterRelation);
	});

	const equivalentCount = $derived(allPairs().filter((p) => p.entry.fromRelationship === 'equivalent').length);
	const relatedCount = $derived(allPairs().filter((p) => p.entry.fromRelationship === 'related').length);

	const isLoading = $derived(
		$frameworks.length === 0 ||
		(fwAId && controlsA.length === 0) ||
		(fwBId && ($controlsData[fwBId] || []).length === 0)
	);
</script>

<svelte:head>
	<title>Framework Comparison — Compliance Mapper</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold">Framework Comparison</h1>
	<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
		Select two frameworks to compare their controls and mappings side by side.
	</p>
</div>

<!-- Framework selectors -->
<div class="flex flex-wrap gap-4 items-end mb-6">
	<div class="flex-1 min-w-[200px]">
		<label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1" for="compare-fw-a">
			Framework A
		</label>
		<select
			id="compare-fw-a"
			bind:value={fwAId}
			class="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
		>
			{#each $frameworks as fw}
				<option value={fw.id}>{fw.shortName} — {fw.name}</option>
			{/each}
		</select>
	</div>

	<div class="flex items-center justify-center pb-2 text-2xl text-gray-400 dark:text-gray-600 shrink-0" aria-hidden="true">
		↔
	</div>

	<div class="flex-1 min-w-[200px]">
		<label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1" for="compare-fw-b">
			Framework B
		</label>
		<select
			id="compare-fw-b"
			bind:value={fwBId}
			class="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
		>
			{#each $frameworks as fw}
				<option value={fw.id}>{fw.shortName} — {fw.name}</option>
			{/each}
		</select>
	</div>
</div>

{#if fwAId === fwBId && fwAId}
	<div class="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-300">
		Please select two different frameworks to compare.
	</div>
{:else if isLoading}
	<p class="text-center text-gray-400 py-10">Loading…</p>
{:else if allPairs().length === 0}
	<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-8 text-center">
		<p class="text-gray-400 text-sm">No mappings found between these two frameworks.</p>
	</div>
{:else}
	<!-- Summary bar + filter -->
	<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
		<div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
			<span class="font-semibold text-gray-800 dark:text-gray-200">{allPairs().length} mapping{allPairs().length !== 1 ? 's' : ''}</span>
			{#if equivalentCount > 0}
				<span class="flex items-center gap-1.5">
					<span class="mapping-sym equivalent" style="display:inline-flex">≡</span>
					{equivalentCount} equivalent
				</span>
			{/if}
			{#if relatedCount > 0}
				<span class="flex items-center gap-1.5">
					<span class="mapping-sym related" style="display:inline-flex">~</span>
					{relatedCount} related
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Filter:</span>
			{#each [['all', 'All'], ['equivalent', 'Equivalent'], ['related', 'Related']] as [val, label]}
				<button
					class="px-3 py-1 rounded-lg text-xs font-medium transition-colors border {filterRelation === val ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
					onclick={() => (filterRelation = val)}
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- Mappings list -->
	<div class="space-y-3">
		{#each filteredPairs() as { leftControl, entry }}
			{@const toControl = entry.otherControl}
			{@const rel = entry.fromRelationship}
			{@const isAsym = entry.isAsymmetric}
			{@const notes = !isAsym ? entry.mapping?.notes : null}

			<div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
				<!-- Control pair row -->
				<div class="flex flex-col sm:flex-row items-stretch gap-0">
					<!-- Left control (Framework A) -->
					<div class="flex-1 p-4 min-w-0" style="border-left: 3px solid {fwA?.color ?? '#6b7280'}">
						<div class="flex items-center gap-2 mb-2">
							{#if fwA}<FwBadge fw={fwA} />{/if}
						</div>
						<span class="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded mb-1" style="background:{fwA?.color ?? '#6b7280'}20;color:{fwA?.color ?? '#6b7280'}">{leftControl.ref}</span>
						<p class="font-semibold text-sm mt-1"><button class="ctrl-title-btn" onclick={() => openControlDetail(leftControl)}>{leftControl.title}</button></p>
						{#if leftControl.description}
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{leftControl.description}</p>
						{/if}
						<div class="flex flex-wrap gap-1 mt-2">
							{#if leftControl.theme}<span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{leftControl.theme}</span>{/if}
							{#if leftControl.category}<span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{leftControl.category}</span>{/if}
						</div>
						{#if isAsym && entry.fromNotes}
							<div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
								<p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
									<span aria-label="Rationale from A to B">Rationale (A→B)</span>
								</p>
								<p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{entry.fromNotes}</p>
							</div>
						{/if}
					</div>

					<!-- Relation column -->
					<div class="flex sm:flex-col items-center justify-center px-4 py-3 sm:py-0 sm:w-24 shrink-0 gap-2 border-t sm:border-t-0 sm:border-x border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
						<div class="flex sm:flex-col items-center gap-1.5">
							<span
								class="mapping-sym {rel} {isAsym ? 'asymmetric' : ''}"
								aria-hidden="true"
								title="{rel === 'equivalent' ? 'Equivalent' : 'Related'}{isAsym ? ` (A to B: ${rel}, B to A: ${entry.toRelationship})` : ''}"
							>{rel === 'equivalent' ? '≡' : '~'}</span>
							<span class="text-xs font-semibold {rel === 'equivalent' ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'} text-center leading-tight">
								{rel === 'equivalent' ? 'Equivalent' : 'Related'}
							</span>
						</div>
						{#if isAsym}
							<div class="flex flex-col items-center gap-0.5">
								<span class="text-xs text-gray-400 dark:text-gray-500 text-center leading-tight" aria-label="B to A">B→A:</span>
								<span class="text-xs font-semibold {entry.toRelationship === 'equivalent' ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'} text-center leading-tight">
									{entry.toRelationship === 'equivalent' ? 'Equivalent' : 'Related'}
								</span>
							</div>
						{/if}
					</div>

					<!-- Right control (Framework B) -->
					<div class="flex-1 p-4 min-w-0" style="border-left: 3px solid {fwB?.color ?? '#6b7280'}">
						<div class="flex items-center gap-2 mb-2">
							{#if fwB}<FwBadge fw={fwB} />{/if}
						</div>
						<span class="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded mb-1" style="background:{fwB?.color ?? '#6b7280'}20;color:{fwB?.color ?? '#6b7280'}">{toControl.ref}</span>
						<p class="font-semibold text-sm mt-1"><button class="ctrl-title-btn" onclick={() => openControlDetail(toControl)}>{toControl.title}</button></p>
						{#if toControl.description}
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{toControl.description}</p>
						{/if}
						<div class="flex flex-wrap gap-1 mt-2">
							{#if toControl.theme}<span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{toControl.theme}</span>{/if}
							{#if toControl.category}<span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{toControl.category}</span>{/if}
						</div>
						{#if isAsym && entry.toNotes}
							<div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
								<p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
									<span aria-label="Rationale from B to A">Rationale (B→A)</span>
								</p>
								<p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{entry.toNotes}</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Rationale (symmetric) -->
				{#if notes}
					<div class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Rationale</p>
						<p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{notes}</p>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if filteredPairs().length === 0 && filterRelation !== 'all'}
		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-8 text-center mt-3">
			<p class="text-gray-400 text-sm">No {filterRelation} mappings found between these frameworks.</p>
		</div>
	{/if}

	<p class="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
		<span class="mapping-sym equivalent" style="display:inline-flex">≡</span> Equivalent &nbsp;
		<span class="mapping-sym related" style="display:inline-flex">~</span> Related &nbsp;
		<span class="mapping-sym asymmetric related" style="display:inline-flex">~</span> Asymmetric (A→B ≠ B→A) &nbsp;·&nbsp; Click a control name to view its implementation checklist
	</p>
{/if}

<ControlDetailModal
	open={detailOpen}
	control={detailControl}
	framework={detailControl ? $frameworks.find((f) => f.id === detailControl.frameworkId) : null}
	todos={detailControl ? (todosData[detailControl.id] ?? []) : []}
	onclose={() => (detailOpen = false)}
/>


<style>
.ctrl-title-btn {
background: transparent;
border: 0;
padding: 0;
text-align: left;
font: inherit;
font-weight: 600;
cursor: pointer;
}
.ctrl-title-btn:hover {
text-decoration: underline;
color: #2563eb; /* blue-600 */
}
</style>
