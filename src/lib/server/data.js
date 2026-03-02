import frameworksJson from '../../../data/frameworks.json';
import controlsJson from '../../../data/controls.json';
import mappingsJson from '../../../data/mappings.json';

export const frameworks = frameworksJson;
export const controlsData = controlsJson;
export const mappings = mappingsJson;

// Flat lookup map: controlId → control object
export const controlsById = {};
for (const controls of Object.values(controlsData)) {
	for (const control of controls) {
		controlsById[control.id] = control;
	}
}
