<script>
	import { goto } from '$app/navigation';
	import { frameworks, controlsData, mappings, progress, user, dbEnabled } from '$lib/stores.js';
	import { apiFetch } from '$lib/api.js';
	import FrameworkCard from '$lib/components/FrameworkCard.svelte';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import { onMount } from 'svelte';

	let stats = $state(null);

	onMount(async () => {
		try {
			stats = await apiFetch('/stats');
		} catch {}
	});

	const allControls = $derived(Object.values($controlsData).flat());
	const total = $derived(allControls.length);
	const completed = $derived(allControls.filter((c) => ($progress[c.id] || 'not_started') === 'completed').length);
	const inProgress = $derived(allControls.filter((c) => ($progress[c.id] || 'not_started') === 'in_progress').length);
	const open = $derived(total - completed - inProgress);
	const score = $derived(total > 0 ? Math.round(((completed + inProgress * 0.5) / total) * 100) : 0);

	/** Count how many mappings involve each framework (as source or target) */
	const mappingCountByFw = $derived(() => {
		const counts = {};
		$mappings.forEach((m) => {
			if (m.sourceControl?.frameworkId) counts[m.sourceControl.frameworkId] = (counts[m.sourceControl.frameworkId] || 0) + 1;
			if (m.targetControl?.frameworkId) counts[m.targetControl.frameworkId] = (counts[m.targetControl.frameworkId] || 0) + 1;
		});
		return counts;
	});

	const CATEGORY_ORDER = [
		'Information Security',
		'EU Regulation',
		'German Regulation',
		'IT Governance',
		'Risk Management',
		'Industry Standard',
	];

	/** Frameworks grouped by category, in defined order */
	const frameworksByCategory = $derived(() => {
		const groups = {};
		$frameworks.forEach((fw) => {
			const cat = fw.category || 'Other';
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(fw);
		});
		// Sort categories by defined order, then alphabetically for unknowns
		const ordered = {};
		[...CATEGORY_ORDER, ...Object.keys(groups).filter((c) => !CATEGORY_ORDER.includes(c)).sort()].forEach((cat) => {
			if (groups[cat]) ordered[cat] = groups[cat];
		});
		return ordered;
	});

	const statItems = $derived(() => {
		if (!stats) return [];
		return [
			{ label: 'Frameworks', value: stats.frameworkCount },
			{ label: 'Controls', value: stats.controlCount },
			{ label: 'Mappings', value: stats.mappingCount },
			...Object.entries(stats.mappingsByRelationship || {}).map(([rel, count]) => ({
				label: rel.charAt(0).toUpperCase() + rel.slice(1),
				value: count,
			})),
		];
	});
</script>

<svelte:head>
	<title>Compliance Mapper — Frameworks</title>
</svelte:head>

<div class="mb-8" style="display:flex;align-items:flex-start;gap:2rem">
	<div style="flex:1;min-width:0">
		<h1 class="text-3xl font-bold">Compliance Mapper</h1>
		<p class="mt-2 text-base text-gray-600 dark:text-gray-400 max-w-3xl">
			Explore and compare cybersecurity &amp; privacy compliance frameworks. See how controls map
			across ISO 27001, NIS2, GDPR, DORA, CIS Controls and NIST CSF — so you can close gaps and
			reduce duplication.
		</p>
		{#if stats}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each statItems() as item}
					<span class="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-sm">
						<span class="font-bold text-gray-800 dark:text-gray-200">{item.value}</span>
						<span class="text-gray-500 dark:text-gray-400">{item.label}</span>
					</span>
				{/each}
			</div>
		{/if}
	</div>
	{#if $user && total > 0}
		<div style="flex-shrink:0">
			<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
				<DonutChart {score} />
				<div class="text-xs font-semibold text-gray-600 dark:text-gray-400">Overall Score</div>
				<div class="text-xs text-gray-400 dark:text-gray-500 text-center" style="line-height:1.4">
					<span class="text-green-600 dark:text-green-400 font-medium">{completed} done</span>
					{#if inProgress > 0}
						· <span class="text-amber-600 dark:text-amber-400 font-medium">{inProgress} in progress</span>
					{/if}
					{#if open > 0}
						· {open} open
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
	Supported Frameworks
</h2>

{#if $frameworks.length === 0}
	<div class="text-center py-10 text-gray-400">Loading…</div>
{:else}
	{#each Object.entries(frameworksByCategory()) as [category, fws]}
		<div class="mb-8">
			<h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 border-b border-gray-100 dark:border-gray-800 pb-1">{category}</h3>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each fws as fw}
					<FrameworkCard
						{fw}
						controls={$controlsData[fw.id] || []}
						mappingCount={mappingCountByFw()[fw.id] || 0}
						progress={$progress}
						user={$user}
						onclick={(f) => goto(`/frameworks/${f.id}`)}
					/>
				{/each}
			</div>
		</div>
	{/each}
{/if}
