<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores.js';

	const baseUrl = $derived(
		typeof window !== 'undefined' ? window.location.origin : ''
	);

	const endpoints = [
		{
			method: 'GET',
			path: '/api/frameworks',
			desc: 'List all supported compliance frameworks.',
			params: [],
			defaultUrl: '/api/frameworks',
		},
		{
			method: 'GET',
			path: '/api/frameworks/:id',
			desc: 'Get a single framework by its ID.',
			params: [{ name: 'id', desc: 'Framework ID (e.g. iso27001-2022)' }],
			defaultUrl: '/api/frameworks/iso27001-2022',
		},
		{
			method: 'GET',
			path: '/api/frameworks/:id/controls',
			desc: 'List all controls for a given framework.',
			params: [{ name: 'id', desc: 'Framework ID' }],
			defaultUrl: '/api/frameworks/iso27001-2022/controls',
		},
		{
			method: 'GET',
			path: '/api/controls',
			desc: 'List all controls across all frameworks.',
			params: [{ name: '?framework=', desc: 'Optional framework filter' }],
			defaultUrl: '/api/controls?framework=iso27001-2022',
		},
		{
			method: 'GET',
			path: '/api/controls/:id',
			desc: 'Get a single control by its ID.',
			params: [{ name: 'id', desc: 'Control ID' }],
			defaultUrl: '/api/controls/iso27001-2022-5.1',
		},
		{
			method: 'GET',
			path: '/api/mappings',
			desc: 'Query control mappings. Supports filters.',
			params: [
				{ name: '?from=', desc: 'Source framework ID' },
				{ name: '?to=', desc: 'Target framework ID' },
				{ name: '?control=', desc: 'Control ID (source or target)' },
				{ name: '?relationship=', desc: 'equivalent | related' },
			],
			defaultUrl: '/api/mappings?from=iso27001-2022&to=nistcsf',
		},
		{
			method: 'GET',
			path: '/api/mappings/:id',
			desc: 'Get a single mapping by its ID.',
			params: [{ name: 'id', desc: 'Mapping ID' }],
			defaultUrl: '/api/mappings/1',
		},
		{
			method: 'GET',
			path: '/api/stats',
			desc: 'Get summary statistics about the dataset.',
			params: [],
			defaultUrl: '/api/stats',
		},
		{
			method: 'GET',
			path: '/api/themes',
			desc: 'List unique control themes. Optional ?framework= filter.',
			params: [{ name: '?framework=', desc: 'Optional framework filter' }],
			defaultUrl: '/api/themes?framework=iso27001-2022',
		},
	];

	const MAX_RESPONSE_LENGTH = 4000;

	let tryResults = $state({});
	let tryLoading = $state({});
	/** @type {Record<string, string>} */
	let tryUrls = $state(Object.fromEntries(endpoints.map((ep) => [ep.path, ep.defaultUrl])));
	let apiKey = $state('');

	async function tryEndpoint(ep) {
		const key = ep.path;
		tryLoading[key] = true;
		tryResults[key] = '';
		const url = tryUrls[key] || ep.defaultUrl;
		try {
			const headers = {};
			if (apiKey.trim()) headers['x-api-key'] = apiKey.trim();
			const res = await fetch(url, { headers });
			const json = await res.json();
			tryResults[key] = JSON.stringify(json, null, 2).slice(0, MAX_RESPONSE_LENGTH);
		} catch (err) {
			tryResults[key] = `Error: ${err.message}`;
		} finally {
			tryLoading[key] = false;
		}
	}

	onMount(() => {
		if (!$user) goto('/');
	});
</script>

<svelte:head>
	<title>API Documentation — Compliance Mapper</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold">REST API Documentation</h1>
	<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
		Use the JSON API to integrate control mappings into your own tools and workflows.
	</p>
</div>

<div class="space-y-4">
	<!-- Base URL -->
	<div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
		<div class="bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
			<h2 class="font-semibold text-sm">Base URL</h2>
		</div>
		<div class="px-5 py-4">
			<code class="text-blue-600 dark:text-blue-400 font-mono text-sm bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded"
				>{baseUrl}</code>
		</div>
	</div>

	<!-- Authentication / API Key header -->
	<div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
		<div class="bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
			<h2 class="font-semibold text-sm">API Key (for Try it)</h2>
		</div>
		<div class="px-5 py-4 space-y-2">
			<p class="text-xs text-gray-500 dark:text-gray-400">
				Provide your API key to include it as an <code class="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">x-api-key</code> header in the requests below. Generate API keys under <strong>Settings → API Keys</strong>.
			</p>
			<input
				type="text"
				bind:value={apiKey}
				placeholder="cm_…  (optional)"
				class="w-full font-mono text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>
	</div>

	<!-- Endpoint cards -->
	{#each endpoints as ep}
		<div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
			<div
				class="bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3"
			>
				<span class="method-badge method-get">{ep.method}</span>
				<code class="font-mono text-sm font-semibold">{ep.path}</code>
			</div>
			<div class="px-5 py-4 space-y-3">
				<p class="text-sm text-gray-700 dark:text-gray-300">{ep.desc}</p>
				{#if ep.params.length > 0}
					<div class="space-y-1">
						{#each ep.params as param}
							<div class="flex items-start gap-2 text-xs">
								<code class="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300 shrink-0">{param.name}</code>
								<span class="text-gray-500 dark:text-gray-400">{param.desc}</span>
							</div>
						{/each}
					</div>
				{/if}
				<!-- Editable request URL -->
				<div class="flex items-center gap-2">
					<span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">URL</span>
					<input
						type="text"
						bind:value={tryUrls[ep.path]}
						class="flex-1 font-mono text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div class="pt-1">
					<button
						class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
						disabled={tryLoading[ep.path]}
						onclick={() => tryEndpoint(ep)}
					>
						{tryLoading[ep.path] ? 'Loading…' : 'Try it →'}
					</button>
				</div>
				{#if tryResults[ep.path] !== undefined && tryResults[ep.path] !== ''}
					<pre class="try-result api-code bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-700 dark:text-gray-300">{tryResults[ep.path]}</pre>
				{/if}
			</div>
		</div>
	{/each}
</div>
