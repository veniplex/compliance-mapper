<script>
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores.js';
	import { onMount } from 'svelte';

	onMount(() => {
		if ($user) {
			goto('/dashboard', { replaceState: true });
		} else {
			goto('/frameworks', { replaceState: true });
		}
	});
</script>
