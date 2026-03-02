<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { frameworks, controlsData, mappings, progress, user } from '$lib/stores.js';
	import { authFetch } from '$lib/api.js';
	import { getContext } from 'svelte';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import RelPill from '$lib/components/RelPill.svelte';
	import ProgressBadge from '$lib/components/ProgressBadge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { PROGRESS_CYCLE, getPreferences } from '$lib/utils.js';

	const loadProgress = getContext('loadProgress');

	const fwId = $derived($page.params.id);
	const fw = $derived($frameworks.find((f) => f.id === fwId));
	const controls = $derived($controlsData[fwId] || []);

	let modalOpen = $state(false);
	let modalControl = $state(null);
	let modalMappings = $state([]);

	function openControl(control) {
		modalControl = control;
		modalMappings = $mappings.filter(
			(m) =>
				(m.sourceControl && m.sourceControl.id === control.id) ||
				(m.targetControl && m.targetControl.id === control.id)
		);
		modalOpen = true;
	}

	async function handleProgressClick(controlId) {
		if (!$user) return;
		const current = $progress[controlId] || 'not_started';
		const next = PROGRESS_CYCLE[(PROGRESS_CYCLE.indexOf(current) + 1) % PROGRESS_CYCLE.length];

		const prefs = getPreferences();
		const applyToEquivalent = prefs.applyToEquivalent !== false;

		const equivalentIds = applyToEquivalent
			? getEquivalentControlIds(controlId)
			: [];
		const idsToUpdate = [controlId, ...equivalentIds];

		// Optimistic update
		const prev = { ...$progress };
		const updated = { ...$progress };
		idsToUpdate.forEach((id) => { updated[id] = next; });
		progress.set(updated);

		try {
			await Promise.all(
				idsToUpdate.map((id) =>
					authFetch('PUT', `/progress/${encodeURIComponent(id)}`, { status: next })
				)
			);
		} catch {
			progress.set(prev);
		}
	}

	function getEquivalentControlIds(controlId) {
		const ids = new Set();
		$mappings.forEach((m) => {
			if (m.relationship !== 'equivalent') return;
			if (m.sourceControl?.id === controlId && m.targetControl) ids.add(m.targetControl.id);
			else if (m.targetControl?.id === controlId && m.sourceControl) ids.add(m.sourceControl.id);
		});
		return Array.from(ids);
	}

	function otherControl(m, controlId) {
		return m.sourceControl?.id === controlId ? m.targetControl : m.sourceControl;
	}

	const fwName = $derived(fw?.name ?? '');
</script>

<svelte:head>
	<title>{fwName || 'Framework'} — Compliance Mapper</title>
</svelte:head>

<div class="mb-6">
	<button
		class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
		onclick={() => goto('/')}
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
		Back to Frameworks
	</button>

	{#if fw}
		<div class="flex items-center gap-3 mb-2">
			<FwBadge {fw} />
			<span class="text-xs text-gray-400 dark:text-gray-500">{controls.length} controls</span>
		</div>
		<h1 class="text-2xl font-bold">{fw.name}</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">{fw.description}</p>
	{/if}
</div>

{#if !fw}
	<p class="text-center text-gray-400 py-10">Framework not found.</p>
{:else if controls.length === 0}
	<p class="text-center text-gray-400 py-10">Loading…</p>
{:else}
	<div class="space-y-2">
		{#each controls as control}
			<div
				class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 flex items-start gap-3 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer"
				role="button"
				tabindex="0"
				onclick={() => openControl(control)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && openControl(control)}
			>
				{#if $user}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<span onclick={(e) => { e.stopPropagation(); handleProgressClick(control.id); }}>
						<ProgressBadge controlId={control.id} status={$progress[control.id] || 'not_started'} />
					</span>
				{/if}
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{control.ref}</span>
						{#if control.theme}
							<span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{control.theme}</span>
						{/if}
					</div>
					<p class="text-sm font-medium mt-0.5 leading-snug">{control.title}</p>
					{#if control.description}
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{control.description}</p>
					{/if}
				</div>
				<svg class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</div>
		{/each}
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
						{@const other = otherControl(m, modalControl.id)}
						{#if other}
							{@const otherFw = $frameworks.find((f) => f.id === other.frameworkId)}
							<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-start gap-3">
								<RelPill relationship={m.relationship} />
								<div class="min-w-0">
									{#if otherFw}
										<FwBadge fw={otherFw} />
									{/if}
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
