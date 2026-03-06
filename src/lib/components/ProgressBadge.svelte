<script>
	import { PROGRESS_CLASSES, PROGRESS_ICONS, PROGRESS_LABELS } from '$lib/utils.js';

	/** @type {{ controlId: string; status: string; onclick?: (id: string) => void }} */
	let { controlId, status = 'not_started', onclick } = $props();

	const cls = $derived(PROGRESS_CLASSES[status] ?? PROGRESS_CLASSES.not_started);
	const icon = $derived(PROGRESS_ICONS[status] ?? PROGRESS_ICONS.not_started);
	const label = $derived(PROGRESS_LABELS[status] ?? PROGRESS_LABELS.not_started);
</script>

<button
	class="progress-btn {cls}"
	aria-label="Progress: {label}. Click to change."
	title={label}
	onclick={() => onclick?.(controlId)}
>{icon}</button>
