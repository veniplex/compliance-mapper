import { json } from '@sveltejs/kit';

export function GET() {
	return json({ data: { dbEnabled: process.env.STANDALONE_MODE !== 'true' } });
}
