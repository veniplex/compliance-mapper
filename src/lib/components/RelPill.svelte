<script>
	/** @type {{ relationship: string }} */
	let { relationship } = $props();
</script>

<span class="rel-pill {relationship}">{relationship}</span>
