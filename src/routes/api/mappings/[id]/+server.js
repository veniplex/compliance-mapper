import { json, error } from '@sveltejs/kit';
import { mappings, controlsById } from '$lib/server/data.js';

export function GET({ params }) {
	const mapping = mappings.find((m) => m.id === params.id);
	if (!mapping) error(404, `Mapping '${params.id}' not found.`);
	return json({
		data: {
			...mapping,
			sourceControl: controlsById[mapping.sourceControlId] || null,
			targetControl: controlsById[mapping.targetControlId] || null,
		},
	});
}
