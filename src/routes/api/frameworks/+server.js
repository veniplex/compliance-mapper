import { json } from '@sveltejs/kit';
import { frameworks } from '$lib/server/data.js';

export function GET() {
	return json({ data: frameworks });
}
