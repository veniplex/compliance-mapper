<script>
	/** @type {{ fw: { color: string; shortName: string } }} */
	let { fw } = $props();
</script>

<span
	class="fw-badge"
	style="background:{fw.color}20;color:{fw.color};border:1px solid {fw.color}40"
>{fw.shortName}</span>
