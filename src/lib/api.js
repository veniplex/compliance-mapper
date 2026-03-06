import { get } from 'svelte/store';
import { token } from './stores.js';

/** Simple fetch wrapper for public API endpoints */
export async function apiFetch(path) {
	const res = await fetch(`/api${path}`);
	if (!res.ok) throw new Error(`API error ${res.status}`);
	const json = await res.json();
	return json.data;
}

/** Fetch wrapper that attaches the JWT Bearer token */
export async function authFetch(method, path, body) {
	const headers = { 'Content-Type': 'application/json' };
	const t = get(token);
	if (t) headers['Authorization'] = `Bearer ${t}`;
	const res = await fetch(`/api${path}`, {
		method,
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	const json = text ? JSON.parse(text) : {};
	if (!res.ok) {
		const err = new Error(json.error || 'Request failed');
		err.status = res.status;
		throw err;
	}
	return json.data;
}
