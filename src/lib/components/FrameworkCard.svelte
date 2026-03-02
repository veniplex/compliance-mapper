<script>
	import FwBadge from './FwBadge.svelte';
	import ProgressBadge from './ProgressBadge.svelte';

	/**
	 * @type {{
	 *   fw: { id: string; color: string; shortName: string; name: string; description: string };
	 *   controls?: any[];
	 *   progress?: Record<string, string>;
	 *   user?: any;
	 *   onclick?: (fw: any) => void;
	 *   onprogressclick?: (id: string) => void;
	 * }}
	 */
	let { fw, controls = [], progress = {}, user = null, onclick, onprogressclick } = $props();

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
</script>

<div
	class="fw-card border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
	role="button"
	tabindex="0"
	onclick={() => onclick?.(fw)}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onclick?.(fw)}
>
	<div class="h-1.5" style="background:{fw.color}"></div>
	<div class="p-5">
		<div class="flex items-start justify-between gap-2 mb-2">
			<FwBadge {fw} />
			{#if total > 0}
				<span class="text-xs text-gray-400 dark:text-gray-500 font-medium">{total} controls</span>
			{/if}
		</div>
		<h3 class="font-semibold text-sm leading-snug mb-1">{fw.name}</h3>
		<p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">{fw.description}</p>

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
	</div>
</div>
