import { json, error } from '@sveltejs/kit';
import { frameworks, mappings, controlsById } from '$lib/server/data.js';

export function GET({ url }) {
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const control = url.searchParams.get('control');
	const relationship = url.searchParams.get('relationship');

	if (from && !frameworks.find((f) => f.id === from)) error(400, `Unknown framework '${from}'.`);
	if (to && !frameworks.find((f) => f.id === to)) error(400, `Unknown framework '${to}'.`);

	let results = mappings;

	if (from) {
		results = results.filter((m) => {
			const src = controlsById[m.sourceControlId];
			return src && src.frameworkId === from;
		});
	}
	if (to) {
		results = results.filter((m) => {
			const tgt = controlsById[m.targetControlId];
			return tgt && tgt.frameworkId === to;
		});
	}
	if (control) {
		results = results.filter(
			(m) => m.sourceControlId === control || m.targetControlId === control
		);
	}
	if (relationship) {
		results = results.filter((m) => m.relationship === relationship);
	}

	const enriched = results.map((m) => ({
		...m,
		sourceControl: controlsById[m.sourceControlId] || null,
		targetControl: controlsById[m.targetControlId] || null,
	}));

	return json({ data: enriched });
}
