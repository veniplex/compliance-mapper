<script>
	import { user, dbEnabled } from '$lib/stores.js';
	import AuthModal from './AuthModal.svelte';

	/** @type {{ currentView: string; onnavigate: (view: string) => void; onsettings?: () => void; onsignout?: () => void }} */
	let { currentView, onnavigate, onsettings, onsignout } = $props();

	let mobileMenuOpen = $state(false);
	let authModalOpen = $state(false);
	let authMode = $state('signin');

	// Theme
	let isDark = $state(false);

	function initTheme() {
		if (typeof localStorage === 'undefined') return;
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		isDark = stored === 'dark' || (!stored && prefersDark);
		document.documentElement.classList.toggle('dark', isDark);
	}

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	function openAuth(mode) {
		authMode = mode;
		authModalOpen = true;
	}

	function navigate(view) {
		onnavigate(view);
		mobileMenuOpen = false;
	}

	$effect(() => {
		initTheme();
	});

	const navItems = $derived([
		{ view: 'dashboard', label: 'Dashboard', authRequired: true },
		{ view: 'frameworks', label: 'Frameworks', authRequired: false },
		{ view: 'controls-table', label: 'Controls Table', authRequired: false },
		{ view: 'apidocs', label: 'API', authRequired: false },
	]);

	const visibleNavItems = $derived(
		navItems.filter((i) => {
			if (i.authRequired && !$user) return false;
			if (i.view === 'apidocs' && !$dbEnabled) return false;
			return true;
		})
	);
</script>

<header
	class="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center h-16 gap-4">
		<div class="flex items-center gap-2 min-w-0">
			<span class="text-2xl" aria-hidden="true">🛡️</span>
			<span class="font-bold text-lg tracking-tight truncate">Compliance Mapper</span>
			<span
				class="hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ml-1"
				>EU Cybersecurity</span
			>
		</div>

		<nav class="hidden sm:flex items-center gap-1 ml-4 text-sm font-medium">
			{#each visibleNavItems as item}
				<button
					data-view={item.view}
					class="nav-btn px-3 py-1.5 rounded-lg"
					class:active={currentView === item.view}
					onclick={() => navigate(item.view)}>{item.label}</button
				>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-2">
			{#if $dbEnabled}
				{#if $user}
					<span
						class="hidden sm:block text-xs text-gray-500 dark:text-gray-400 truncate max-w-[9rem]"
						>{$user.username || $user.email}</span
					>
					<button
						class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						onclick={onsettings}>Settings</button
					>
					<button
						class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						onclick={onsignout}>Sign Out</button
					>
				{:else}
					<button
						class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						onclick={() => openAuth('signin')}>Sign In</button
					>
					<button
						class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
						onclick={() => openAuth('signup')}>Sign Up</button
					>
				{/if}
			{/if}

			<button
				aria-label="Toggle dark mode"
				class="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				onclick={toggleTheme}>{isDark ? '☀️' : '🌙'}</button
			>

			<button
				class="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
				aria-label="Menu"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>
		</div>
	</div>

	{#if mobileMenuOpen}
		<div
			class="sm:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
		>
			<div class="px-4 py-2 flex flex-col gap-1 text-sm font-medium">
				{#each visibleNavItems as item}
					<button
						data-view={item.view}
						class="nav-btn mobile text-left px-3 py-2 rounded-lg"
						class:active={currentView === item.view}
						onclick={() => navigate(item.view)}>{item.label}</button
					>
				{/each}
			</div>
		</div>
	{/if}
</header>

<AuthModal
	bind:open={authModalOpen}
	bind:mode={authMode}
	onclose={() => (authModalOpen = false)}
	onsuccess={() => navigate('dashboard')}
/>
