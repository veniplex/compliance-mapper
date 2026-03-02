import { json, error } from '@sveltejs/kit';
import { controlsById } from '$lib/server/data.js';

export function GET({ params }) {
	const control = controlsById[params.id];
	if (!control) error(404, `Control '${params.id}' not found.`);
	return json({ data: control });
}
