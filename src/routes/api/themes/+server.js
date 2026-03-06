import { json, error } from '@sveltejs/kit';
import { controlsData, frameworks } from '$lib/server/data.js';

export function GET({ url }) {
	const framework = url.searchParams.get('framework');
	let controls;
	if (framework) {
		if (!frameworks.find((f) => f.id === framework)) error(404, `Framework '${framework}' not found.`);
		controls = controlsData[framework] || [];
	} else {
		controls = Object.values(controlsData).flat();
	}
	const themes = [...new Set(controls.map((c) => c.theme))].sort();
	return json({ data: themes });
}
