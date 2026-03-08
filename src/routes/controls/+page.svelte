<script>
	import { frameworks, controlsData, mappings, progress, user } from '$lib/stores.js';
	import { authFetch } from '$lib/api.js';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import ProgressBadge from '$lib/components/ProgressBadge.svelte';
	import MappingDetailModal from '$lib/components/MappingDetailModal.svelte';
	import ControlDetailModal from '$lib/components/ControlDetailModal.svelte';
	import { PROGRESS_CYCLE, getPreferences, getDeduplicatedMappings, getFromControl } from '$lib/utils.js';
	import todosData from '../../../data/todos.json';

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

	// Control-detail modal (todos & details for a single control)
	let controlDetailOpen = $state(false);
	/** @type {any} */
	let selectedControl = $state(null);

	const selectedControls = $derived(selectedFwId ? ($controlsData[selectedFwId] || []) : []);
	const otherFrameworks = $derived($frameworks.filter((f) => f.id !== selectedFwId));

	function openMappingDetail(entry) {
		selectedEntry = entry;
		mappingModalOpen = true;
	}

	function openControlDetail(control) {
		selectedControl = control;
		controlDetailOpen = true;
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

	const selectedFromControl = $derived(selectedEntry ? getFromControl(selectedEntry) : null);
	const selectedFromFw = $derived(getFwForControl(selectedFromControl));
	const selectedToFw = $derived(getFwForControl(selectedEntry?.otherControl));
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
									<button
										class="title text-gray-600 dark:text-gray-400 text-left hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0 font-[inherit] text-[inherit]"
										onclick={() => openControlDetail(control)}
									>{control.title}</button>
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
		<span class="mapping-sym none" style="display:inline-flex">—</span> No mapping &nbsp;· Click an icon to view mapping details · Click a control name to view todos
	</p>
{/if}

<MappingDetailModal
	open={mappingModalOpen}
	entry={selectedEntry}
	fromControl={selectedFromControl}
	fromFramework={selectedFromFw}
	toFramework={selectedToFw}
	onclose={() => (mappingModalOpen = false)}
/>

<ControlDetailModal
	open={controlDetailOpen}
	control={selectedControl}
	framework={selectedControl ? $frameworks.find((f) => f.id === selectedControl.frameworkId) : null}
	todos={selectedControl ? (todosData[selectedControl.id] ?? []) : []}
	onclose={() => (controlDetailOpen = false)}
/>
