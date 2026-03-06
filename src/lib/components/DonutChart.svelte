<script>
	import { DONUT_CIRC, DONUT_R, scoreRingColor } from '$lib/utils.js';

	/** @type {{ score: number; size?: 'sm' | 'md' }} */
	let { score, size = 'md' } = $props();

	const px = $derived(size === 'sm' ? 96 : 112);
	const textPx = $derived(size === 'sm' ? 20 : 24);
	const ringColor = $derived(scoreRingColor(score));
	const dashOffset = $derived(DONUT_CIRC * (1 - score / 100));
</script>

<div style="position:relative;width:{px}px;height:{px}px;flex-shrink:0">
	<svg
		viewBox="0 0 100 100"
		style="width:100%;height:100%;display:block;transform:rotate(-90deg)"
		role="img"
		aria-label="Overall compliance score: {score} out of 100"
	>
		<circle cx="50" cy="50" r={DONUT_R} fill="none" stroke="#e5e7eb" stroke-width="10" />
		<circle
			cx="50"
			cy="50"
			r={DONUT_R}
			fill="none"
			stroke={ringColor}
			stroke-width="10"
			stroke-dasharray={DONUT_CIRC.toFixed(2)}
			stroke-dashoffset={dashOffset.toFixed(2)}
			stroke-linecap="round"
			style="transition:stroke-dashoffset 0.5s ease"
		/>
	</svg>
	<div
		style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"
	>
		<span style="font-size:{textPx}px;font-weight:700;line-height:1">{score}</span>
		<span style="font-size:11px;color:#9ca3af;line-height:1;margin-top:2px">/ 100</span>
	</div>
</div>
