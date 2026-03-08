<script>
	import { user, progress, todoChecks } from '$lib/stores.js';
	import { authFetch } from '$lib/api.js';

	/**
	 * Reusable implementation checklist for a single control.
	 * Handles optimistic updates, syncs to /api/todos and /api/progress.
	 *
	 * @type {{ control: any; todos: string[] }}
	 */
	let { control, todos } = $props();

	/** Checks for this control: todoIndex → boolean */
	const checks = $derived(control ? ($todoChecks[control.id] ?? {}) : {});
	const checkedCount = $derived(todos ? todos.filter((_, i) => checks[i] === true).length : 0);
	const totalCount = $derived(todos?.length ?? 0);

	/** Derive progress status from checked count vs total */
	function computeStatus(checked, total) {
		if (total === 0) return 'not_started';
		if (checked === total) return 'completed';
		if (checked > 0) return 'in_progress';
		return 'not_started';
	}

	const autoStatus = $derived(computeStatus(checkedCount, totalCount));

	const progressColorClass = $derived(
		autoStatus === 'completed'
			? 'text-green-600 dark:text-green-400 font-semibold'
			: autoStatus === 'in_progress'
				? 'text-amber-600 dark:text-amber-400 font-semibold'
				: 'text-gray-500 dark:text-gray-400'
	);

	const progressBarClass = $derived(
		autoStatus === 'completed' ? 'bg-green-500' : autoStatus === 'in_progress' ? 'bg-amber-500' : 'bg-transparent'
	);

	async function toggleTodo(index) {
		if (!$user || !control) return;
		const newChecked = !(checks[index] === true);

		// Optimistic update
		const prev = $todoChecks;
		const updated = { ...$todoChecks };
		updated[control.id] = { ...(updated[control.id] ?? {}), [index]: newChecked };
		todoChecks.set(updated);

		// Sync progress status based on new check state
		const prevStatus = $progress[control.id] ?? 'not_started';
		const newChecks = updated[control.id];
		const newCheckedCount = todos.filter((_, i) => newChecks[i] === true).length;
		const newStatus = computeStatus(newCheckedCount, todos.length);

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

{#if todos?.length > 0}
	<div class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
		<div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
			<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
				Implementation Checklist
			</p>
			<span class="text-xs {progressColorClass}">
				{checkedCount}/{totalCount}
			</span>
		</div>

		<!-- Progress bar -->
		<div class="h-1 bg-gray-100 dark:bg-gray-800">
			<div
				class="h-1 transition-all duration-300 {progressBarClass}"
				style="width:{totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0}%"
			></div>
		</div>

		<ul class="divide-y divide-gray-100 dark:divide-gray-800">
			{#each todos as todoText, i}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
				<li
					class="flex items-start gap-3 px-4 py-3 transition-colors {$user ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'opacity-60'}"
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
	{:else}
		<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
			<span>Status auto-updated based on checklist</span>
			<span class="{progressColorClass}">
				{autoStatus === 'completed' ? '● Completed' : autoStatus === 'in_progress' ? '◐ In progress' : '○ Not started'}
			</span>
		</div>
	{/if}
{/if}
