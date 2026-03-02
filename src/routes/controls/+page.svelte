<script>
	import { frameworks, controlsData, mappings, progress, user } from '$lib/stores.js';
	import { authFetch } from '$lib/api.js';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import RelPill from '$lib/components/RelPill.svelte';
	import ProgressBadge from '$lib/components/ProgressBadge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { PROGRESS_CYCLE, getPreferences } from '$lib/utils.js';

	let selectedFwId = $state('');

	// Mapping-detail modal (specific mapping: source ↔ target)
	let mappingModalOpen = $state(false);
	let selectedMapping = $state(null);

	const selectedControls = $derived(selectedFwId ? ($controlsData[selectedFwId] || []) : []);
	const otherFrameworks = $derived($frameworks.filter((f) => f.id !== selectedFwId));

	function openMappingDetail(m) {
		selectedMapping = m;
		mappingModalOpen = true;
	}

	function getMappingToFw(controlId, fwId) {
		return $mappings.filter(
			(m) =>
				(m.sourceControl?.id === controlId && m.targetControl?.frameworkId === fwId) ||
				(m.targetControl?.id === controlId && m.sourceControl?.frameworkId === fwId)
		);
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
		<option value="">Select a framework…</option>
		{#each $frameworks as fw}
			<option value={fw.id}>{fw.shortName} — {fw.name}</option>
		{/each}
	</select>
</div>

{#if !selectedFwId}
	<p class="text-center text-gray-400 py-10">Select a framework above to view its controls and mappings.</p>
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
							{@const fwMappings = getMappingToFw(control.id, fw.id)}
							<td class="px-2 py-3 text-center">
								{#if fwMappings.length === 0}
									<span class="mapping-sym none" title="No mapping to {fw.shortName}">—</span>
								{:else}
									<div class="flex flex-wrap gap-0.5 justify-center">
										{#each fwMappings as m}
											{@const other = m.sourceControl?.id === control.id ? m.targetControl : m.sourceControl}
											{@const label = `${m.relationship === 'equivalent' ? 'Equivalent' : 'Related'}: ${other?.ref ?? ''} — ${other?.title ?? ''}`}
											<button
												class="mapping-sym {m.relationship} ctable-icon"
												aria-label={label}
												title={label}
												onclick={(e) => { e.stopPropagation(); openMappingDetail(m); }}
											>{m.relationship === 'equivalent' ? '≡' : '~'}</button>
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

{#if selectedMapping}
	{@const src = selectedMapping.sourceControl}
	{@const tgt = selectedMapping.targetControl}
	{@const srcFw = getFwForControl(src)}
	{@const tgtFw = getFwForControl(tgt)}
	<Modal open={mappingModalOpen} title="Control Mapping Detail" onclose={() => (mappingModalOpen = false)}>
		<div class="flex items-center gap-2 mb-2 flex-wrap">
			<RelPill relationship={selectedMapping.relationship} />
			<span class="text-xs text-gray-500 dark:text-gray-400">ID: {selectedMapping.id}</span>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{#each [[src, srcFw, 'Source'], [tgt, tgtFw, 'Target']] as [ctrl, fw, label]}
				{#if ctrl}
					<div class="rounded-xl border p-4" style="border-color:{fw?.color ?? '#6b7280'}40;background:{fw?.color ?? '#6b7280'}08">
						<p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:{fw?.color ?? '#6b7280'}">{label}</p>
						{#if fw}<span class="fw-badge" style="background:{fw.color}20;color:{fw.color};border:1px solid {fw.color}40">{fw.shortName}</span>{/if}
						<p class="font-mono font-bold mt-2 text-sm">{ctrl.ref}</p>
						<p class="font-semibold mt-0.5 text-sm">{ctrl.title}</p>
						{#if ctrl.description}<p class="text-gray-600 dark:text-gray-400 mt-2 text-xs leading-relaxed">{ctrl.description}</p>{/if}
						<div class="flex flex-wrap gap-1 mt-3">
							{#if ctrl.theme}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{ctrl.theme}</span>{/if}
							{#if ctrl.category}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{ctrl.category}</span>{/if}
						</div>
					</div>
				{/if}
			{/each}
		</div>
		{#if selectedMapping.notes}
			<div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
				<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
				<p class="text-gray-700 dark:text-gray-300">{selectedMapping.notes}</p>
			</div>
		{/if}
	</Modal>
{/if}
