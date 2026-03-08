<script>
	import { goto } from '$app/navigation';
	import { frameworks, controlsData, progress, user } from '$lib/stores.js';
	import todosData from '../../../data/todos.json';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import FwBadge from '$lib/components/FwBadge.svelte';
	import { PROGRESS_ICONS, PROGRESS_LABELS, scoreRingColor } from '$lib/utils.js';

	// Normalize variant theme names to canonical names
	const THEME_NORMALIZE = {
		'Logging and Monitoring': 'Logging & Monitoring',
		'HR Security': 'Human Resources',
		Physical: 'Physical Security',
		'Security Awareness': 'Awareness & Training',
		Audit: 'Audit & Accountability',
		'Audit and Accountability': 'Audit & Accountability',
		'Operations Security': 'Operations',
		People: 'Human Resources',
	};

	const THEME_ICONS = {
		Governance: '🏛️',
		'Human Resources': '👥',
		'Awareness & Training': '📚',
		'Malware Protection': '🛡️',
		'Asset Management': '📦',
		'Business Continuity': '🔄',
		'Supply Chain Security': '🔗',
		'Incident Management': '🚨',
		'Logging & Monitoring': '📊',
		'Vulnerability Management': '🔍',
		'Configuration Management': '⚙️',
		Compliance: '✅',
		Privacy: '🔒',
		Cryptography: '🔐',
		'Data Protection': '🛡️',
		'Network Security': '🌐',
		'Secure Development': '💻',
		'Access Control': '🔑',
		Operations: '🔧',
		Risk: '⚠️',
		Technology: '🖥️',
		'Physical Security': '🏢',
		'Cloud Security': '☁️',
		'Threat Intelligence': '🎯',
		'Threat Detection': '🔎',
		'System Hardening': '🔩',
		'Mobile Devices': '📱',
		'Audit & Accountability': '📋',
	};

	// Achievability thresholds (based on average todos per control).
	// Data ranges from ~4.67 (easiest) to ~9.0 (hardest) with a mean around 6.0.
	// < 5.75: notably below average effort — "Quick Win"
	// 5.75–6.5: typical compliance effort — "Moderate"
	// ≥ 6.5: above average, multi-step implementation — "Complex"
	const ACHIEVABILITY_QUICK = 5.75;
	const ACHIEVABILITY_MODERATE = 6.5;

	function achievabilityInfo(avgTodos) {
		if (avgTodos < ACHIEVABILITY_QUICK)
			return { label: 'Quick Win', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' };
		if (avgTodos < ACHIEVABILITY_MODERATE)
			return { label: 'Moderate', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' };
		return { label: 'Complex', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' };
	}

	// Build roadmap milestones from loaded control data
	const milestones = $derived.by(() => {
		const allControls = Object.values($controlsData).flat();
		if (allControls.length === 0) return [];

		const fwMap = Object.fromEntries($frameworks.map((fw) => [fw.id, fw]));

		/** @type {Record<string, { theme: string; controls: any[]; fwIds: Set<string>; totalTodos: number; todoCount: number }>} */
		const themeMap = {};

		for (const c of allControls) {
			const raw = c.theme || 'Other';
			const theme = THEME_NORMALIZE[raw] ?? raw;
			if (!themeMap[theme]) {
				themeMap[theme] = { theme, controls: [], fwIds: new Set(), totalTodos: 0, todoCount: 0 };
			}
			themeMap[theme].controls.push(c);
			themeMap[theme].fwIds.add(c.frameworkId);
			const cTodos = todosData[c.id];
			if (cTodos && cTodos.length > 0) {
				themeMap[theme].totalTodos += cTodos.length;
				themeMap[theme].todoCount += 1;
			}
		}

		return Object.values(themeMap)
			.map(({ theme, controls, fwIds, totalTodos, todoCount }) => {
				// Avg todos per control that has todos; default 6.0 (≈ dataset mean) when
				// a theme has no controls with todos, placing it in the "Moderate" range.
				const avgTodos = todoCount > 0 ? totalTodos / todoCount : 6.0;

				const fwList = [...fwIds]
					.map((id) => fwMap[id])
					.filter(Boolean)
					.sort((a, b) => a.shortName.localeCompare(b.shortName));

				const done = controls.filter(
					(c) => ($progress[c.id] ?? 'not_started') === 'completed'
				).length;
				const ip = controls.filter(
					(c) => ($progress[c.id] ?? 'not_started') === 'in_progress'
				).length;
				const total = controls.length;
				const open = total - done - ip;
				const pct = total > 0 ? Math.round((done / total) * 100) : 0;
				const ipPct = total > 0 ? Math.round((ip / total) * 100) : 0;
				const achievability = achievabilityInfo(avgTodos);

				return { theme, controls, fwList, avgTodos, done, ip, open, total, pct, ipPct, achievability };
			})
			.sort((a, b) => a.avgTodos - b.avgTodos);
	});

	// Phase labels based on position in sorted list
	function phaseFor(index, total) {
		if (index < Math.ceil(total / 3)) return 1;
		if (index < Math.ceil((2 * total) / 3)) return 2;
		return 3;
	}

	const PHASE_LABELS = {
		1: { label: 'Phase 1 — Foundation', desc: 'Start here: lower-effort controls with broad framework coverage.' },
		2: { label: 'Phase 2 — Core Implementation', desc: 'Build on your foundation with the bulk of compliance requirements.' },
		3: { label: 'Phase 3 — Advanced Controls', desc: 'Complete coverage by tackling the most complex controls.' },
	};

	// Overall stats
	const allControls = $derived(Object.values($controlsData).flat());
	const total = $derived(allControls.length);
	const completed = $derived(
		allControls.filter((c) => ($progress[c.id] ?? 'not_started') === 'completed').length
	);
	const inProgress = $derived(
		allControls.filter((c) => ($progress[c.id] ?? 'not_started') === 'in_progress').length
	);
	const open = $derived(total - completed - inProgress);
	const score = $derived(
		total > 0 ? Math.round(((completed + inProgress * 0.5) / total) * 100) : 0
	);
	const completedPct = $derived(total > 0 ? Math.round((completed / total) * 100) : 0);
	const inProgressPct = $derived(total > 0 ? Math.round((inProgress / total) * 100) : 0);

	// Milestones fully completed
	const milestonesCompleted = $derived(milestones.filter((m) => m.pct === 100).length);
	const milestonesInProgress = $derived(milestones.filter((m) => m.pct > 0 && m.pct < 100).length);

	// Expanded state for milestone accordion
	/** @type {Set<string>} */
	let expandedThemes = $state(new Set());

	function toggleExpand(theme) {
		const next = new Set(expandedThemes);
		if (next.has(theme)) next.delete(theme);
		else next.add(theme);
		expandedThemes = next;
	}

	function progressStatusClass(status) {
		if (status === 'completed') return 'text-green-600 dark:text-green-400';
		if (status === 'in_progress') return 'text-amber-600 dark:text-amber-400';
		return 'text-gray-400 dark:text-gray-600';
	}
</script>

<svelte:head>
	<title>Roadmap — Compliance Mapper</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold">Compliance Roadmap</h1>
	<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
		A complete end-to-end roadmap for achieving full coverage of all compliance controls, ordered by
		achievability — easiest first.
	</p>
</div>

{#if !$user}
	<div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
		<div class="text-4xl mb-3">🗺️</div>
		<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Sign in to view your roadmap</h2>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Sign in to track progress and follow your personalized compliance journey.
		</p>
	</div>
{:else if total === 0}
	<div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
		<div class="text-4xl mb-3">⏳</div>
		<p class="text-sm text-gray-500 dark:text-gray-400">Loading roadmap data…</p>
	</div>
{:else}
	<!-- ── Overall Progress Header ───────────────────────────────────────── -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
		<!-- Score donut -->
		<div
			class="col-span-2 sm:col-span-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col items-center gap-1"
		>
			<DonutChart {score} size="sm" />
			<div class="text-xs font-semibold text-gray-600 dark:text-gray-400">Overall Score</div>
		</div>

		<!-- Completed -->
		<div
			class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
		>
			<div class="h-1 bg-green-500"></div>
			<div class="p-5">
				<div class="text-3xl font-bold text-green-600 dark:text-green-400">{completed}</div>
				<div class="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-1">Completed</div>
				<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{completedPct}% of {total}</div>
			</div>
		</div>

		<!-- In Progress -->
		<div
			class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
		>
			<div class="h-1 bg-amber-500"></div>
			<div class="p-5">
				<div class="text-3xl font-bold text-amber-600 dark:text-amber-400">{inProgress}</div>
				<div class="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-1">In Progress</div>
				<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{inProgressPct}% of {total}</div>
			</div>
		</div>

		<!-- Open -->
		<div
			class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
		>
			<div class="h-1 bg-slate-400 dark:bg-slate-600"></div>
			<div class="p-5">
				<div class="text-3xl font-bold text-slate-600 dark:text-slate-300">{open}</div>
				<div class="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-1">Open</div>
				<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
					{milestones.length} milestones · {milestonesCompleted} done · {milestonesInProgress} active
				</div>
			</div>
		</div>
	</div>

	<!-- Overall progress bar -->
	<div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4 mb-8">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-semibold text-gray-700 dark:text-gray-200">Overall Completion</span>
			<span class="text-sm font-bold" style="color:{scoreRingColor(score)}">{score}%</span>
		</div>
		<div class="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
			<div
				class="h-full bg-green-500 transition-all duration-500"
				style="width:{completedPct}%"
			></div>
			<div
				class="h-full bg-amber-400 transition-all duration-500"
				style="width:{inProgressPct}%"
			></div>
		</div>
		<div class="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
			<span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-green-500"></span> Completed</span>
			<span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-amber-400"></span> In Progress</span>
			<span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span> Open</span>
		</div>
	</div>

	<!-- ── Roadmap Milestones ─────────────────────────────────────────────── -->
	{#each milestones as milestone, idx}
		{@const phase = phaseFor(idx, milestones.length)}
		{@const prevPhase = idx > 0 ? phaseFor(idx - 1, milestones.length) : 0}
		{@const isExpanded = expandedThemes.has(milestone.theme)}

		<!-- Phase header (shown when phase changes) -->
		{#if phase !== prevPhase}
			<div class="mt-6 mb-3 flex items-center gap-3">
				<div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
				<div class="text-center">
					<div class="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
						{PHASE_LABELS[phase].label}
					</div>
					<div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{PHASE_LABELS[phase].desc}</div>
				</div>
				<div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
			</div>
		{/if}

		<!-- Milestone card -->
		<div
			class="rounded-2xl border bg-white dark:bg-gray-900 mb-3 overflow-hidden transition-shadow hover:shadow-md {milestone.pct === 100 ? 'border-green-300 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'}"
		>
			<!-- Card header (clickable to expand) -->
			<button
				class="w-full text-left px-5 py-4 flex items-start gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
				aria-expanded={isExpanded}
				onclick={() => toggleExpand(milestone.theme)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleExpand(milestone.theme)}
			>
				<!-- Step number -->
				<div class="shrink-0 flex flex-col items-center gap-1 pt-0.5">
					<div
						class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
						{milestone.pct === 100
							? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
							: milestone.pct > 0
								? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
								: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}"
					>
						{idx + 1}
					</div>
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex flex-wrap items-center gap-2 mb-1">
						<span class="text-base font-semibold text-gray-900 dark:text-gray-100">
							{THEME_ICONS[milestone.theme] ?? '📌'}
							{milestone.theme}
						</span>

						<!-- Achievability badge -->
						<span
							class="text-xs px-2 py-0.5 rounded-full font-medium border {milestone.achievability.bg} {milestone.achievability.color} {milestone.achievability.border}"
						>
							<span class="inline-block w-1.5 h-1.5 rounded-full {milestone.achievability.dot} mr-1"></span>{milestone.achievability.label}
						</span>

						<!-- Completed badge -->
						{#if milestone.pct === 100}
							<span
								class="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
							>
								✓ Complete
							</span>
						{/if}
					</div>

					<!-- Stats row -->
					<div
						class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3"
					>
						<span>{milestone.total} controls</span>
						<span class="text-green-600 dark:text-green-400 font-medium">
							{milestone.done} completed
						</span>
						{#if milestone.ip > 0}
							<span class="text-amber-600 dark:text-amber-400 font-medium">
								{milestone.ip} in progress
							</span>
						{/if}
						{#if milestone.open > 0}
							<span>{milestone.open} open</span>
						{/if}
					</div>

					<!-- Progress bar -->
					<div class="flex items-center gap-2 mb-3">
						<div class="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
							<div
								class="h-full bg-green-500 transition-all duration-500"
								style="width:{milestone.pct}%"
							></div>
							<div
								class="h-full bg-amber-400 transition-all duration-500"
								style="width:{milestone.ipPct}%"
							></div>
						</div>
						<span class="text-xs font-semibold w-8 text-right text-gray-600 dark:text-gray-400"
							>{milestone.pct}%</span
						>
					</div>

					<!-- Framework badges (stopPropagation keeps them from toggling the accordion) -->
					{#if milestone.fwList.length > 0}
						<div class="flex flex-wrap gap-1.5" role="none">
							{#each milestone.fwList as fw}
								<a
									href="/frameworks/{fw.id}"
									class="text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
									style="background:{fw.color}20;color:{fw.color};border:1px solid {fw.color}40;padding:2px 8px"
									title="View {fw.name}"
									onclick={(e) => e.stopPropagation()}
								>
									{fw.shortName}
								</a>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Expand chevron -->
				<div
					class="shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200 mt-1"
					style="transform: rotate({isExpanded ? 180 : 0}deg)"
					aria-hidden="true"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</div>
			</button>

			<!-- Expanded control list -->
			{#if isExpanded}
				<div class="border-t border-gray-100 dark:border-gray-800">
					<div class="overflow-x-auto">
						<table class="min-w-full text-sm">
							<thead class="bg-gray-50 dark:bg-gray-800">
								<tr>
									<th
										class="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-24"
										>Ref</th
									>
									<th
										class="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
										>Control</th
									>
									<th
										class="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-36"
										>Framework</th
									>
									<th
										class="px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-28"
										>Status</th
									>
								</tr>
							</thead>
							<tbody>
								{#each milestone.controls as control}
									{@const status = $progress[control.id] ?? 'not_started'}
									{@const fw = $frameworks.find((f) => f.id === control.frameworkId)}
									<tr
										class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
										onclick={() => goto(`/frameworks/${control.frameworkId}`)}
										onkeydown={(e) =>
											(e.key === 'Enter' || e.key === ' ') &&
											goto(`/frameworks/${control.frameworkId}`)}
										tabindex="0"
									>
										<td class="px-5 py-2.5">
											<span
												class="font-mono text-xs font-semibold"
												style="color:{fw?.color ?? 'inherit'}">{control.ref}</span
											>
										</td>
										<td class="px-5 py-2.5 text-gray-700 dark:text-gray-300 max-w-xs">
											<span class="line-clamp-2">{control.title}</span>
										</td>
										<td class="px-5 py-2.5">
											{#if fw}
												<FwBadge {fw} />
											{/if}
										</td>
										<td class="px-5 py-2.5 text-center">
											<span
												class="text-base {progressStatusClass(status)}"
												title={PROGRESS_LABELS[status]}
											>
												{PROGRESS_ICONS[status]}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{/each}
{/if}
