<script>
	import Modal from '$lib/components/Modal.svelte';
	import { user, progress, todoChecks } from '$lib/stores.js';
	import { authFetch } from '$lib/api.js';
	import { PROGRESS_CYCLE } from '$lib/utils.js';

	/**
	 * @type {{
	 *   open: boolean;
	 *   control: any;
	 *   framework: any;
	 *   todos: string[];
	 *   onclose: () => void;
	 * }}
	 */
	let { open, control, framework, todos, onclose } = $props();

	/** Checks for the current control: todoIndex → boolean */
	const checks = $derived(
		control ? ($todoChecks[control.id] ?? {}) : {}
	);

	const checkedCount = $derived(
		todos ? todos.filter((_, i) => checks[i] === true).length : 0
	);

	const totalCount = $derived(todos?.length ?? 0);

	/** Auto-derive progress status from todo checks */
	const autoStatus = $derived(
		totalCount === 0
			? 'not_started'
			: checkedCount === totalCount
				? 'completed'
				: checkedCount > 0
					? 'in_progress'
					: 'not_started'
	);

	async function toggleTodo(index) {
		if (!$user || !control) return;
		const newChecked = !(checks[index] === true);

		// Optimistic update
		const prev = $todoChecks;
		const updated = { ...$todoChecks };
		updated[control.id] = { ...(updated[control.id] ?? {}), [index]: newChecked };
		todoChecks.set(updated);

		// Sync progress if needed
		const prevStatus = $progress[control.id] ?? 'not_started';
		const newChecks = updated[control.id];
		const newCheckedCount = todos.filter((_, i) => newChecks[i] === true).length;
		const newStatus =
			newCheckedCount === todos.length
				? 'completed'
				: newCheckedCount > 0
					? 'in_progress'
					: 'not_started';

		if (newStatus !== prevStatus) {
			const prevProgress = { ...$progress };
			progress.set({ ...$progress, [control.id]: newStatus });
			try {
				await authFetch('PUT', `/progress/${encodeURIComponent(control.id)}`, {
					status: newStatus,
				});
			} catch {
				progress.set(prevProgress);
			}
		}

		try {
			await authFetch('PUT', `/todos/${encodeURIComponent(control.id)}`, {
				todoIndex: index,
				checked: newChecked,
			});
		} catch {
			todoChecks.set(prev);
		}
	}
</script>

{#if control}
	<Modal {open} {onclose}>
		{#snippet title()}
			<div class="min-w-0">
				<div class="flex items-center gap-2 flex-wrap">
					<span
						class="font-mono font-bold text-base"
						style="color:{framework?.color ?? 'inherit'}"
					>{control.ref}</span>
					{#if framework}
						<span
							class="text-xs px-2 py-0.5 rounded-full font-semibold"
							style="background:{framework.color}20;color:{framework.color};border:1px solid {framework.color}40"
						>{framework.shortName}</span>
					{/if}
				</div>
				<div class="font-semibold text-base mt-0.5">{control.title}</div>
			</div>
		{/snippet}

		<!-- Control description -->
		{#if control.description}
			<p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{control.description}</p>
		{/if}

		<!-- Tags -->
		{#if control.theme || control.category}
			<div class="flex flex-wrap gap-1.5">
				{#if control.theme}
					<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{control.theme}</span>
				{/if}
				{#if control.category}
					<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{control.category}</span>
				{/if}
			</div>
		{/if}

		<!-- To-do checklist -->
		{#if todos?.length > 0}
			<div class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
						Implementation Checklist
					</p>
					<span class="text-xs font-semibold {checkedCount === totalCount ? 'text-green-600 dark:text-green-400' : checkedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}">
						{checkedCount}/{totalCount}
					</span>
				</div>

				<!-- Progress bar -->
				<div class="h-1 bg-gray-100 dark:bg-gray-800">
					<div
						class="h-1 transition-all duration-300 {checkedCount === totalCount ? 'bg-green-500' : checkedCount > 0 ? 'bg-amber-500' : 'bg-transparent'}"
						style="width:{totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0}%"
					></div>
				</div>

				<ul class="divide-y divide-gray-100 dark:divide-gray-800">
					{#each todos as todoText, i}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
						<li
							class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors {$user ? '' : 'opacity-60'}"
							onclick={() => $user && toggleTodo(i)}
						>
							<div class="mt-0.5 shrink-0 w-4 h-4 rounded border transition-colors {checks[i] === true ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'} flex items-center justify-center">
								{#if checks[i] === true}
									<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
									</svg>
								{/if}
							</div>
							<span class="text-sm leading-relaxed {checks[i] === true ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}">{todoText}</span>
						</li>
					{/each}
				</ul>
			</div>

			{#if !$user}
				<p class="text-xs text-gray-500 dark:text-gray-400 text-center">
					Sign in to track your implementation progress
				</p>
			{/if}

			<!-- Status indicator -->
			{#if $user}
				<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
					<span>Status auto-updated based on checklist</span>
					<span class="{autoStatus === 'completed' ? 'text-green-600 dark:text-green-400 font-semibold' : autoStatus === 'in_progress' ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}">
						{autoStatus === 'completed' ? '● Completed' : autoStatus === 'in_progress' ? '◐ In progress' : '○ Not started'}
					</span>
				</div>
			{/if}
		{/if}
	</Modal>
{/if}
