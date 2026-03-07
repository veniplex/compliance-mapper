<script>
	import ProgressBadge from './ProgressBadge.svelte';

	/**
	 * @type {{
	 *   fw: { id: string; color: string; shortName: string; name: string; description: string; version?: string; lastUpdated?: string; region?: string; type?: string; url?: string };
	 *   controls?: any[];
	 *   mappingCount?: number;
	 *   progress?: Record<string, string>;
	 *   user?: any;
	 *   onclick?: (fw: any) => void;
	 * }}
	 */
	let { fw, controls = [], mappingCount = 0, progress = {}, user = null, onclick } = $props();

	const total = $derived(controls.length);
	const completed = $derived(controls.filter((c) => (progress[c.id] || 'not_started') === 'completed').length);
	const inProgress = $derived(controls.filter((c) => (progress[c.id] || 'not_started') === 'in_progress').length);
	const open = $derived(total - completed - inProgress);
	const pct = $derived(total > 0 ? Math.round((completed / total) * 100) : 0);
	const parts = $derived(() => {
		const p = [`${completed} done`];
		if (inProgress > 0) p.push(`${inProgress} in progress`);
		if (open > 0) p.push(`${open} open`);
		return p.join(' · ');
	});

	const typeColors = {
		Standard: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
		Regulation: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
		Framework: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
	};
	const typeClass = $derived(typeColors[fw.type] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400');
</script>

<div
	class="fw-card border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
	role="button"
	tabindex="0"
	onclick={() => onclick?.(fw)}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onclick?.(fw)}
>
	<div class="h-1.5" style="background:{fw.color}"></div>
	<div class="p-5">
		<div class="flex items-start justify-between gap-2 mb-3">
			<div class="flex flex-wrap gap-1">
				{#if fw.type}
					<span class="text-xs font-semibold px-2 py-0.5 rounded-full {typeClass}">{fw.type}</span>
				{/if}
				{#if fw.region}
					<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{fw.region}</span>
				{/if}
			</div>
			{#if fw.shortName}
				<span class="shrink-0 text-xs font-bold px-2 py-0.5 rounded-md" style="background:{fw.color}20;color:{fw.color}">{fw.shortName}</span>
			{/if}
		</div>
		<h3 class="font-bold text-base leading-tight">{fw.name}</h3>
		{#if fw.version}
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{fw.version}</p>
		{/if}
		<p class="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-3 leading-relaxed line-clamp-3">{fw.description}</p>
		<div class="flex gap-3 text-xs">
			{#if total > 0}
				<span class="font-semibold text-gray-800 dark:text-gray-200">{total} <span class="font-normal text-gray-500 dark:text-gray-400">controls</span></span>
			{/if}
			{#if mappingCount > 0}
				<span class="font-semibold text-gray-800 dark:text-gray-200">{mappingCount} <span class="font-normal text-gray-500 dark:text-gray-400">mappings</span></span>
			{/if}
		</div>

		{#if user && total > 0}
			<div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
				<div class="flex items-center justify-between text-xs mb-1">
					<span class="text-gray-500 dark:text-gray-400">{parts()}</span>
					<span class="font-semibold text-gray-700 dark:text-gray-300">{pct}%</span>
				</div>
				<div class="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
					<div class="h-full rounded-full bg-green-500 transition-all" style="width:{pct}%"></div>
				</div>
			</div>
		{/if}

		<div class="mt-3 flex items-center justify-between">
			{#if fw.url}
				<a
					href={fw.url}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-xs font-medium hover:underline"
					style="color:{fw.color}"
					onclick={(e) => e.stopPropagation()}
				>
					<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
					Official source
				</a>
			{:else}
				<span></span>
			{/if}
			<span class="text-xs text-gray-400 dark:text-gray-500">
				{#if fw.lastUpdated}Updated {fw.lastUpdated}{:else}View controls →{/if}
			</span>
		</div>
	</div>
</div>
