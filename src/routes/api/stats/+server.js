import { json } from '@sveltejs/kit';
import { frameworks, controlsData, mappings } from '$lib/server/data.js';

export function GET() {
	const controlsByFramework = {};
	for (const fw of frameworks) {
		controlsByFramework[fw.id] = (controlsData[fw.id] || []).length;
	}
	const totalControls = Object.values(controlsByFramework).reduce((a, b) => a + b, 0);
	const relationshipCounts = {};
	for (const m of mappings) {
		relationshipCounts[m.relationship] = (relationshipCounts[m.relationship] || 0) + 1;
	}
	return json({
		data: {
			frameworkCount: frameworks.length,
			controlCount: totalControls,
			mappingCount: mappings.length,
			controlsByFramework,
			mappingsByRelationship: relationshipCounts,
		},
	});
}
