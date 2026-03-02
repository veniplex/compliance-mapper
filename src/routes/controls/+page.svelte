<script>
	import { frameworks, controlsData, mappings, progress, user } from '$lib/stores.js';
	import { authFetch } from '$lib/api.js';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import RelPill from '$lib/components/RelPill.svelte';
	import ProgressBadge from '$lib/components/ProgressBadge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { PROGRESS_CYCLE, getPreferences } from '$lib/utils.js';
	import { goto } from '$app/navigation';

	let selectedFwId = $state('');
	let modalOpen = $state(false);
	let modalControl = $state(null);
	let modalMappings = $state([]);

	const selectedControls = $derived(selectedFwId ? ($controlsData[selectedFwId] || []) : []);
	const otherFrameworks = $derived($frameworks.filter((f) => f.id !== selectedFwId));

	function openControl(control) {
		modalControl = control;
		modalMappings = $mappings.filter(
			(m) =>
				(m.sourceControl?.id === control.id) ||
				(m.targetControl?.id === control.id)
		);
		modalOpen = true;
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
	<div class="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
		<table class="min-w-full text-sm bg-white dark:bg-gray-950">
			<thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
				<tr>
					{#if $user}
						<th class="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 text-center w-10"></th>
					{/if}
					<th class="ctable-control-col px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
						Control
					</th>
					{#each otherFrameworks as fw}
						<th class="px-3 py-3 text-center">
							<FwBadge {fw} />
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each selectedControls as control}
					<tr
						class="border-t border-gray-100 dark:border-gray-800"
						onclick={() => openControl(control)}
					>
						{#if $user}
							<td class="px-3 py-3 text-center">
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<span onclick={(e) => handleProgressClick(e, control.id)}>
									<ProgressBadge controlId={control.id} status={$progress[control.id] || 'not_started'} />
								</span>
							</td>
						{/if}
						<td class="ctable-control-col px-4 py-3 control-cell">
							<div class="ref">{control.ref}</div>
							<div class="title text-gray-600 dark:text-gray-400">{control.title}</div>
						</td>
						{#each otherFrameworks as fw}
							{@const fwMappings = getMappingToFw(control.id, fw.id)}
							<td class="px-3 py-3 text-center">
								{#if fwMappings.length === 0}
									<span class="mapping-sym none" title="No mapping">—</span>
								{:else}
									<div class="flex flex-wrap gap-1 justify-center">
										{#each fwMappings as m}
											{@const other = m.sourceControl?.id === control.id ? m.targetControl : m.sourceControl}
											<span
												class="mapping-sym {m.relationship} ctable-icon"
												title="{m.relationship}: {other?.ref ?? ''}"
												tabindex="0"
												role="button"
												aria-label="{m.relationship} mapping to {other?.ref ?? ''}"
											>
												{m.relationship === 'equivalent' ? '●' : '◐'}
											</span>
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
{/if}

{#if modalControl}
	<Modal open={modalOpen} title="{modalControl.ref} — {modalControl.title}" onclose={() => (modalOpen = false)}>
		{#if modalControl.description}
			<p class="text-gray-700 dark:text-gray-300 leading-relaxed">{modalControl.description}</p>
		{/if}
		{#if modalMappings.length > 0}
			<div>
				<h3 class="font-semibold text-sm mb-2">Mappings ({modalMappings.length})</h3>
				<div class="space-y-2">
					{#each modalMappings as m}
						{@const other = m.sourceControl?.id === modalControl.id ? m.targetControl : m.sourceControl}
						{#if other}
							{@const otherFw = $frameworks.find((f) => f.id === other.frameworkId)}
							<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-start gap-3">
								<RelPill relationship={m.relationship} />
								<div class="min-w-0">
									{#if otherFw}<FwBadge fw={otherFw} />{/if}
									<span class="ml-2 font-mono text-xs font-semibold">{other.ref}</span>
									<p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{other.title}</p>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{:else}
			<p class="text-gray-400 text-sm">No mappings found for this control.</p>
		{/if}
	</Modal>
{/if}
