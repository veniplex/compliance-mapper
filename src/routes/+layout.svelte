<script>
	import { onMount, setContext } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import NavBar from '$lib/components/NavBar.svelte';
	import {
		user,
		token,
		frameworks,
		controlsData,
		mappings,
		progress,
		dbEnabled,
		initAuthFromStorage,
		clearAuth,
	} from '$lib/stores.js';
	import { apiFetch, authFetch } from '$lib/api.js';

	let { children } = $props();

	// Map page pathname to nav view IDs for active state highlighting
	const PATH_TO_VIEW = {
		'/frameworks': 'frameworks',
		'/controls': 'controls-table',
		'/api-docs': 'apidocs',
		'/dashboard': 'dashboard',
		'/settings': 'settings',
	};

	const VIEW_TO_PATH = {
		frameworks: '/frameworks',
		'controls-table': '/controls',
		apidocs: '/api-docs',
		dashboard: '/dashboard',
		settings: '/settings',
	};

	const currentView = $derived(PATH_TO_VIEW[$page.url.pathname] ?? 'frameworks');

	function navigate(view) {
		const path = VIEW_TO_PATH[view] ?? '/frameworks';
		goto(path);
	}

	async function handleSignOut() {
		clearAuth();
		goto('/');
	}

	async function loadProgress() {
		if (!$token) return;
		try {
			const entries = await authFetch('GET', '/progress');
			const map = {};
			entries.forEach((e) => { map[e.controlId] = e.status; });
			progress.set(map);
		} catch (err) {
			if (err.status === 401) clearAuth();
		}
	}

	setContext('loadProgress', loadProgress);

	onMount(async () => {
		// Load config
		try {
			const config = await apiFetch('/config');
			dbEnabled.set(config.dbEnabled);
		} catch {}

		// Init auth from storage
		initAuthFromStorage();

		// Validate stored session
		if ($token && $user && $dbEnabled) {
			try {
				await authFetch('GET', '/auth/me');
			} catch (err) {
				if (err.status === 401) clearAuth();
			}
		}

		// Load data
		try {
			const [fwList, mappingList] = await Promise.all([
				apiFetch('/frameworks'),
				apiFetch('/mappings'),
			]);
			frameworks.set(fwList);
			mappings.set(mappingList);

			const cData = {};
			await Promise.all(
				fwList.map(async (fw) => {
					const controls = await apiFetch(`/frameworks/${fw.id}/controls`);
					cData[fw.id] = controls;
				})
			);
			controlsData.set(cData);
		} catch (err) {
			console.error('Failed to load data:', err);
		}

		if ($token) await loadProgress();
	});
</script>

<svelte:head>
	<title>Compliance Mapper — Cybersecurity Framework Overlap</title>
</svelte:head>

<div class="min-h-full">
	<NavBar
		{currentView}
		onnavigate={navigate}
		onsettings={() => navigate('settings')}
		onsignout={handleSignOut}
	/>
	<main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>
</div>
