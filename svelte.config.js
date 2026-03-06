import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';

// Use the Vercel adapter when building on Vercel (VERCEL=1 is set automatically).
// Fall back to the Node adapter for Docker and local production builds.
const adapter = process.env.VERCEL ? adapterVercel() : adapterNode();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter,
	},
};

export default config;
