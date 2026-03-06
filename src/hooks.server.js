import { initDb, STANDALONE_MODE } from '$lib/server/db.js';
import { validateApiKey } from '$lib/server/auth.js';

/** @type {import('@sveltejs/kit').ServerInit} */
export async function init() {
	if (!STANDALONE_MODE) {
		try {
			await initDb();
		} catch (err) {
			console.warn('Database unavailable — auth, progress and settings features will be disabled:', err.message);
		}
	}
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// Handle OPTIONS preflight
	if (event.request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
				'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
			},
		});
	}

	// For API routes, force JSON error responses by setting Accept header
	const isApiRoute = event.url.pathname.startsWith('/api/');
	if (isApiRoute) {
		// Clone request with Accept: application/json so SvelteKit returns JSON errors
		const modifiedRequest = new Request(event.request, {
			headers: new Headers({
				...Object.fromEntries(event.request.headers),
				accept: 'application/json',
			}),
		});
		event = { ...event, request: modifiedRequest };
	}

	// Validate x-api-key when provided on API routes (DB-enabled mode only)
	if (isApiRoute && !STANDALONE_MODE && event.request.headers.has('x-api-key')) {
		const valid = await validateApiKey(event.request);
		if (!valid) {
			return new Response(JSON.stringify({ error: 'Invalid API key.' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	}

	const response = await resolve(event);

	// Transform SvelteKit's { message } error format to { error } for API routes
	if (isApiRoute && response.status >= 400) {
		const contentType = response.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			try {
				const body = await response.json();
				if (body.message !== undefined && body.error === undefined) {
					return new Response(JSON.stringify({ error: body.message }), {
						status: response.status,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
							'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
						},
					});
				}
			} catch {
				// Not valid JSON - fall through
			}
		}
		// Convert HTML error responses to JSON for API routes
		if (contentType.includes('text/html')) {
			const html = await response.text();
			// Extract error from the <title> tag
			const titleMatch = html.match(/<title>([^<]+)<\/title>/);
			const msg = titleMatch ? titleMatch[1] : 'Request failed.';
			return new Response(JSON.stringify({ error: msg }), {
				status: response.status,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	}

	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');

	return response;
}
