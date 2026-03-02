import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');

function loadJSON(filename) {
	return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf8'));
}

export const frameworks = loadJSON('frameworks.json');
export const controlsData = loadJSON('controls.json');
export const mappings = loadJSON('mappings.json');

// Flat lookup map: controlId → control object
export const controlsById = {};
for (const controls of Object.values(controlsData)) {
	for (const control of controls) {
		controlsById[control.id] = control;
	}
}
