import { json, error } from '@sveltejs/kit';
import { frameworks, controlsData } from '$lib/server/data.js';

export function GET({ params }) {
	const framework = frameworks.find((f) => f.id === params.id);
	if (!framework) error(404, `Framework '${params.id}' not found.`);
	return json({ data: controlsData[params.id] || [] });
}
