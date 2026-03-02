<script>
	import { goto } from '$app/navigation';
	import { frameworks, controlsData, progress, user } from '$lib/stores.js';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';

	const allControls = $derived(Object.values($controlsData).flat());
	const total = $derived(allControls.length);
	const completed = $derived(allControls.filter((c) => ($progress[c.id] || 'not_started') === 'completed').length);
	const inProgress = $derived(allControls.filter((c) => ($progress[c.id] || 'not_started') === 'in_progress').length);
	const open = $derived(total - completed - inProgress);
	const score = $derived(total > 0 ? Math.round(((completed + inProgress * 0.5) / total) * 100) : 0);
	const completedPct = $derived(total > 0 ? Math.round((completed / total) * 100) : 0);
	const inProgressPct = $derived(total > 0 ? Math.round((inProgress / total) * 100) : 0);
	const openPct = $derived(100 - completedPct - inProgressPct);

	const fwRows = $derived(
		$frameworks
			.map((fw) => {
				const controls = $controlsData[fw.id] || [];
				const tot = controls.length;
				if (tot === 0) return null;
				const done = controls.filter((c) => ($progress[c.id] || 'not_started') === 'completed').length;
				const ip = controls.filter((c) => ($progress[c.id] || 'not_started') === 'in_progress').length;
				const op = tot - done - ip;
				const pct = Math.round((done / tot) * 100);
				const ipPct = Math.round((ip / tot) * 100);
				return { fw, tot, done, ip, op, pct, ipPct };
			})
			.filter(Boolean)
	);
</script>

<svelte:head>
	<title>Dashboard — Compliance Mapper</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold">Dashboard</h1>
	<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
		Overview of your compliance implementation progress across all frameworks.
	</p>
</div>

{#if !$user}
	<p class="text-center text-gray-400 py-10">Sign in to view the dashboard.</p>
{:else}
	<!-- KPI summary row -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
		<div
			class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col items-center gap-1"
		>
			<DonutChart {score} size="sm" />
			<div class="text-xs font-semibold text-gray-600 dark:text-gray-400">Overall Score</div>
		</div>
		<div
			class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
		>
			<div class="h-1 bg-green-500"></div>
			<div class="p-5">
				<div class="text-3xl font-bold text-green-600 dark:text-green-400">{completed}</div>
				<div class="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-1">Completed</div>
				<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{completedPct}% of {total} controls</div>
			</div>
		</div>
		<div
			class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
		>
			<div class="h-1 bg-amber-500"></div>
			<div class="p-5">
				<div class="text-3xl font-bold text-amber-600 dark:text-amber-400">{inProgress}</div>
				<div class="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-1">In Progress</div>
				<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{inProgressPct}% of {total} controls</div>
			</div>
		</div>
		<div
			class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
		>
			<div class="h-1 bg-slate-400 dark:bg-slate-600"></div>
			<div class="p-5">
				<div class="text-3xl font-bold text-slate-600 dark:text-slate-300">{open}</div>
				<div class="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-1">Open</div>
				<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{openPct}% of {total} controls</div>
			</div>
		</div>
	</div>

	<!-- Per-framework table -->
	<div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
		<div class="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Progress by Framework</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
					<tr>
						<th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Framework</th>
						<th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Controls</th>
						<th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Done</th>
						<th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">In Progress</th>
						<th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Open</th>
						<th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 min-w-[140px]">Progress</th>
					</tr>
				</thead>
				<tbody>
					{#each fwRows as row}
						<tr
							class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
							tabindex="0"
							onclick={() => goto(`/frameworks/${row.fw.id}`)}
							onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && goto(`/frameworks/${row.fw.id}`)}
						>
							<td class="px-5 py-3">
								<FwBadge fw={row.fw} />
							</td>
							<td class="px-5 py-3 text-right text-gray-600 dark:text-gray-400">{row.tot}</td>
							<td class="px-5 py-3 text-right font-medium text-green-600 dark:text-green-400">{row.done}</td>
							<td class="px-5 py-3 text-right font-medium text-amber-600 dark:text-amber-400">{row.ip}</td>
							<td class="px-5 py-3 text-right text-gray-500 dark:text-gray-400">{row.op}</td>
							<td class="px-5 py-3">
								<div class="flex items-center gap-2">
									<div class="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
										<div class="h-full bg-green-500" style="width:{row.pct}%"></div>
										<div class="h-full bg-amber-400" style="width:{row.ipPct}%"></div>
									</div>
									<span class="text-xs font-semibold w-8 text-right text-gray-600 dark:text-gray-400">{row.pct}%</span>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
