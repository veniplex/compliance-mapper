<script>
	import { frameworks, controlsData, mappings, progress, user } from '$lib/stores.js';
	import { authFetch } from '$lib/api.js';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import RelPill from '$lib/components/RelPill.svelte';
	import ProgressBadge from '$lib/components/ProgressBadge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { PROGRESS_CYCLE, getPreferences, getDeduplicatedMappings, getFromControl } from '$lib/utils.js';

	const DEFAULT_FW = 'iso27001';

	let selectedFwId = $state(DEFAULT_FW);

	// When frameworks load, ensure a valid selection
	$effect(() => {
		if ($frameworks.length > 0 && !$frameworks.find((f) => f.id === selectedFwId)) {
			selectedFwId = $frameworks[0].id;
		}
	});

	// Mapping-detail modal (specific mapping: source ↔ target)
	let mappingModalOpen = $state(false);
	/** @type {{ mapping: any, otherControl: any, fromRelationship: string, toRelationship: string, isAsymmetric: boolean } | null} */
	let selectedEntry = $state(null);

	const selectedControls = $derived(selectedFwId ? ($controlsData[selectedFwId] || []) : []);
	const otherFrameworks = $derived($frameworks.filter((f) => f.id !== selectedFwId));

	function openMappingDetail(entry) {
		selectedEntry = entry;
		mappingModalOpen = true;
	}

	function getMappingToFw(controlId, fwId) {
		return getDeduplicatedMappings($mappings, controlId, fwId);
	}

	async function handleProgressClick(e, controlId) {
		e.stopPropagation();
		if (!$user) return;
		const current = $progress[controlId] || 'not_started';
		const next = PROGRESS_CYCLE[(PROGRESS_CYCLE.indexOf(current) + 1) % PROGRESS_CYCLE.length];
		const prefs = getPreferences();
		const equivalentIds = prefs.applyToEquivalent !== false ? getEquivalentIds(controlId) : [];
		const ids = [controlId, ...equivalentIds];
		const prev = { ...$progress };
		const updated = { ...$progress };
		ids.forEach((id) => { updated[id] = next; });
		progress.set(updated);
		try {
			await Promise.all(ids.map((id) => authFetch('PUT', `/progress/${encodeURIComponent(id)}`, { status: next })));
		} catch {
			progress.set(prev);
		}
	}

	function getEquivalentIds(controlId) {
		const ids = new Set();
		$mappings.forEach((m) => {
			if (m.relationship !== 'equivalent') return;
			if (m.sourceControl?.id === controlId && m.targetControl) ids.add(m.targetControl.id);
			else if (m.targetControl?.id === controlId && m.sourceControl) ids.add(m.sourceControl.id);
		});
		return Array.from(ids);
	}

	function getFwForControl(control) {
		return control ? $frameworks.find((f) => f.id === control.frameworkId) : null;
	}
</script>

<svelte:head>
	<title>Controls Mapping Table — Compliance Mapper</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold">Controls Mapping Table</h1>
	<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
		Select a framework to see all its controls and their mappings to every other framework.
	</p>
</div>

<div class="mb-6">
	<label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1" for="ctable-fw-select">
		Framework
	</label>
	<select
		id="ctable-fw-select"
		bind:value={selectedFwId}
		class="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
	>
		{#each $frameworks as fw}
			<option value={fw.id}>{fw.shortName} — {fw.name}</option>
		{/each}
	</select>
</div>

{#if !selectedFwId || $frameworks.length === 0}
	<p class="text-center text-gray-400 py-10">Loading frameworks…</p>
{:else if selectedControls.length === 0}
	<p class="text-center text-gray-400 py-10">Loading…</p>
{:else}
	<div class="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
		<table class="min-w-full text-sm bg-white dark:bg-gray-950">
			<thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
				<tr>
					<th class="ctable-control-col px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
						Control
					</th>
					{#each otherFrameworks as fw}
						<th class="px-2 py-3 text-center">
							<span class="fw-badge" style="background:{fw.color}20;color:{fw.color};border:1px solid {fw.color}40">{fw.shortName}</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100 dark:divide-gray-800">
				{#each selectedControls as control}
					<tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
						<td class="ctable-control-col px-4 py-3">
							<div class="flex items-start gap-2">
								{#if $user}
									<button
										class="shrink-0 mt-0.5 bg-transparent border-0 p-0 cursor-pointer"
										aria-label="Toggle progress"
										onclick={(e) => handleProgressClick(e, control.id)}
									>
										<ProgressBadge controlId={control.id} status={$progress[control.id] || 'not_started'} />
									</button>
								{/if}
								<div class="control-cell min-w-0">
									<div class="ref" style="color:{$frameworks.find(f=>f.id===selectedFwId)?.color ?? 'inherit'}">{control.ref}</div>
									<div class="title text-gray-600 dark:text-gray-400">{control.title}</div>
									{#if control.theme}
										<span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mt-1 inline-block">{control.theme}</span>
									{/if}
								</div>
							</div>
						</td>
						{#each otherFrameworks as fw}
							{@const entries = getMappingToFw(control.id, fw.id)}
							<td class="px-2 py-3 text-center">
								{#if entries.length === 0}
									<span class="mapping-sym none" title="No mapping to {fw.shortName}">—</span>
								{:else}
									<div class="flex flex-nowrap gap-0.5 justify-center">
										{#each entries as entry}
											{@const rel = entry.fromRelationship}
											{@const label = `${rel === 'equivalent' ? 'Equivalent' : 'Related'}: ${entry.otherControl?.ref ?? ''} — ${entry.otherControl?.title ?? ''}${entry.isAsymmetric ? ` (reverse: ${entry.toRelationship})` : ''}`}
											<button
												class="mapping-sym {rel} ctable-icon {entry.isAsymmetric ? 'asymmetric' : ''}"
												aria-label={label}
												title={label}
												onclick={(e) => { e.stopPropagation(); openMappingDetail(entry); }}
											>{rel === 'equivalent' ? '≡' : '~'}</button>
										{/each}
									</div>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
		<span class="mapping-sym equivalent" style="display:inline-flex">≡</span> Equivalent &nbsp;
		<span class="mapping-sym related" style="display:inline-flex">~</span> Related &nbsp;
		<span class="mapping-sym none" style="display:inline-flex">—</span> No mapping &nbsp;· Click an icon to view details
	</p>
{/if}

{#if selectedEntry}
	{@const fromCtrl = getFromControl(selectedEntry)}
	{@const toCtrl = selectedEntry.otherControl}
	{@const fromFw = getFwForControl(fromCtrl)}
	{@const toFw = getFwForControl(toCtrl)}
	<Modal open={mappingModalOpen} title="Control Mapping Detail" onclose={() => (mappingModalOpen = false)}>
		<!-- Visual: FROM box — connector — TO box -->
		<div class="flex flex-col sm:flex-row items-stretch gap-0">
			<!-- FROM control box -->
			{#if fromCtrl}
				<div class="flex-1 rounded-xl border p-4" style="border-color:{fromFw?.color ?? '#6b7280'}40;background:{fromFw?.color ?? '#6b7280'}08">
					<p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:{fromFw?.color ?? '#6b7280'}">From</p>
					{#if fromFw}<span class="fw-badge" style="background:{fromFw.color}20;color:{fromFw.color};border:1px solid {fromFw.color}40">{fromFw.shortName}</span>{/if}
					<p class="font-mono font-bold mt-2 text-sm">{fromCtrl.ref}</p>
					<p class="font-semibold mt-0.5 text-sm">{fromCtrl.title}</p>
					{#if fromCtrl.description}<p class="text-gray-600 dark:text-gray-400 mt-2 text-xs leading-relaxed">{fromCtrl.description}</p>{/if}
					<div class="flex flex-wrap gap-1 mt-3">
						{#if fromCtrl.theme}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{fromCtrl.theme}</span>{/if}
						{#if fromCtrl.category}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{fromCtrl.category}</span>{/if}
					</div>
				</div>
			{/if}

			<!-- Connector -->
			<div class="flex sm:flex-col items-center justify-center px-2 py-2 sm:py-0 sm:w-28 shrink-0 gap-1">
				<div class="flex items-center gap-1">
					<span class="text-gray-400 text-xs">→</span>
					<RelPill relationship={selectedEntry.fromRelationship} />
					<span class="text-gray-400 text-xs">→</span>
				</div>
				{#if selectedEntry.isAsymmetric}
					<span class="text-amber-500 text-xs font-medium">⚠ asymmetric</span>
					<div class="flex items-center gap-1">
						<span class="text-gray-400 text-xs">←</span>
						<RelPill relationship={selectedEntry.toRelationship} />
						<span class="text-gray-400 text-xs">←</span>
					</div>
				{/if}
			</div>

			<!-- TO control box -->
			{#if toCtrl}
				<div class="flex-1 rounded-xl border p-4" style="border-color:{toFw?.color ?? '#6b7280'}40;background:{toFw?.color ?? '#6b7280'}08">
					<p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:{toFw?.color ?? '#6b7280'}">To</p>
					{#if toFw}<span class="fw-badge" style="background:{toFw.color}20;color:{toFw.color};border:1px solid {toFw.color}40">{toFw.shortName}</span>{/if}
					<p class="font-mono font-bold mt-2 text-sm">{toCtrl.ref}</p>
					<p class="font-semibold mt-0.5 text-sm">{toCtrl.title}</p>
					{#if toCtrl.description}<p class="text-gray-600 dark:text-gray-400 mt-2 text-xs leading-relaxed">{toCtrl.description}</p>{/if}
					<div class="flex flex-wrap gap-1 mt-3">
						{#if toCtrl.theme}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{toCtrl.theme}</span>{/if}
						{#if toCtrl.category}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{toCtrl.category}</span>{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Rationale(s) -->
		{#if selectedEntry.isAsymmetric}
			{#if selectedEntry.fromNotes}
				<div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
						Rationale (From → To, {selectedEntry.fromRelationship})
					</p>
					<p class="text-gray-700 dark:text-gray-300">{selectedEntry.fromNotes}</p>
				</div>
			{/if}
			{#if selectedEntry.toNotes}
				<div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
						Rationale (To → From, {selectedEntry.toRelationship})
					</p>
					<p class="text-gray-700 dark:text-gray-300">{selectedEntry.toNotes}</p>
				</div>
			{/if}
		{:else if selectedEntry.mapping.notes}
			<div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
				<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
				<p class="text-gray-700 dark:text-gray-300">{selectedEntry.mapping.notes}</p>
			</div>
		{/if}
	</Modal>
{/if}
