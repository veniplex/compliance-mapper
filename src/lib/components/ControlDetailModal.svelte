<script>
	import Modal from '$lib/components/Modal.svelte';
	import TodoChecklist from '$lib/components/TodoChecklist.svelte';

	/**
	 * Reusable Control Detail modal.
	 * Shows description, tags, and implementation checklist for a single control.
	 *
	 * @type {{
	 *   open: boolean;
	 *   control: any;
	 *   framework: any;
	 *   todos: string[];
	 *   onclose: () => void;
	 * }}
	 */
	let { open, control, framework, todos, onclose } = $props();
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

		<TodoChecklist {control} {todos} />
	</Modal>
{/if}

