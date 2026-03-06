import { json, error } from '@sveltejs/kit';
import { frameworks, controlsData } from '$lib/server/data.js';

export function GET({ url }) {
	const framework = url.searchParams.get('framework');
	if (framework) {
		const fw = frameworks.find((f) => f.id === framework);
		if (!fw) error(404, `Framework '${framework}' not found.`);
		return json({ data: controlsData[framework] || [] });
	}
	return json({ data: Object.values(controlsData).flat() });
}
