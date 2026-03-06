<script>
	import { user, token, persistAuth } from '$lib/stores.js';
	import { authFetch } from '$lib/api.js';
	import { getPreferences, setPreference } from '$lib/utils.js';
	import { onMount } from 'svelte';

	let activeTab = $state('profile');

	// Profile tab
	let profileUsername = $state('');
	let profileEmail = $state('');
	let profileError = $state('');
	let profileSuccess = $state('');
	let profileLoading = $state(false);

	// Password tab
	let currentPassword = $state('');
	let newPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let passwordLoading = $state(false);

	// API keys tab
	let apiKeys = $state([]);
	let apiKeysError = $state('');
	let showNewKeyForm = $state(false);
	let newKeyName = $state('');
	let newKeyLoading = $state(false);
	let revealedKey = $state('');

	// Preferences tab
	let prefApplyEquivalent = $state(true);

	onMount(async () => {
		prefApplyEquivalent = getPreferences().applyToEquivalent !== false;
		if ($user) {
			await loadProfile();
			await loadApiKeys();
		}
	});

	async function loadProfile() {
		try {
			const data = await authFetch('GET', '/settings/profile');
			profileUsername = data.username || '';
			profileEmail = data.email || '';
		} catch {}
	}

	async function saveProfile(e) {
		e.preventDefault();
		profileError = '';
		profileSuccess = '';
		profileLoading = true;
		try {
			const payload = {};
			if (profileUsername) payload.username = profileUsername;
			if (profileEmail) payload.email = profileEmail;
			const data = await authFetch('PATCH', '/settings/profile', payload);
			user.update((u) => ({ ...u, email: data.email, username: data.username }));
			persistAuth($token, { ...$user, email: data.email, username: data.username });
			profileSuccess = 'Profile updated successfully.';
		} catch (err) {
			profileError = err.message || 'Failed to update profile.';
		} finally {
			profileLoading = false;
		}
	}

	async function changePassword(e) {
		e.preventDefault();
		passwordError = '';
		passwordSuccess = '';
		if (newPassword.length < 8) {
			passwordError = 'New password must be at least 8 characters.';
			return;
		}
		passwordLoading = true;
		try {
			await authFetch('PATCH', '/settings/password', { currentPassword, newPassword });
			currentPassword = '';
			newPassword = '';
			passwordSuccess = 'Password changed successfully.';
		} catch (err) {
			passwordError = err.message || 'Failed to change password.';
		} finally {
			passwordLoading = false;
		}
	}

	async function loadApiKeys() {
		try {
			apiKeys = await authFetch('GET', '/settings/apikeys');
		} catch (err) {
			apiKeysError = err.message || 'Failed to load API keys.';
		}
	}

	async function createApiKey() {
		apiKeysError = '';
		newKeyLoading = true;
		try {
			const data = await authFetch('POST', '/settings/apikeys', { name: newKeyName });
			revealedKey = data.key;
			showNewKeyForm = false;
			newKeyName = '';
			await loadApiKeys();
		} catch (err) {
			apiKeysError = err.message || 'Failed to create API key.';
		} finally {
			newKeyLoading = false;
		}
	}

	async function deleteApiKey(keyId) {
		apiKeysError = '';
		try {
			await authFetch('DELETE', `/settings/apikeys/${encodeURIComponent(keyId)}`);
			await loadApiKeys();
		} catch (err) {
			apiKeysError = err.message || 'Failed to revoke API key.';
		}
	}

	function copyKey() {
		navigator.clipboard.writeText(revealedKey).catch(() => {});
	}
</script>

<svelte:head>
	<title>Settings — Compliance Mapper</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold">Settings</h1>
	<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
		Manage your account, password, and API keys.
	</p>
</div>

<!-- Tabs -->
<div class="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
	{#each ['profile', 'password', 'apikeys', 'preferences'] as tab}
		<button
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize"
			class:border-blue-600={activeTab === tab}
			class:text-blue-600={activeTab === tab}
			class:dark:border-blue-400={activeTab === tab}
			class:dark:text-blue-400={activeTab === tab}
			class:border-transparent={activeTab !== tab}
			class:text-gray-500={activeTab !== tab}
			class:dark:text-gray-400={activeTab !== tab}
			onclick={() => (activeTab = tab)}
		>{tab === 'apikeys' ? 'API Keys' : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
	{/each}
</div>

<!-- Profile tab -->
{#if activeTab === 'profile'}
	<div class="max-w-md">
		<form onsubmit={saveProfile} class="space-y-4" novalidate>
			<div>
				<label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1" for="settings-username">Username</label>
				<input
					id="settings-username"
					type="text"
					maxlength="50"
					autocomplete="username"
					bind:value={profileUsername}
					class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
				/>
			</div>
			<div>
				<label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1" for="settings-email">Email</label>
				<input
					id="settings-email"
					type="email"
					autocomplete="email"
					bind:value={profileEmail}
					class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
				/>
			</div>
			{#if profileError}
				<p class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{profileError}</p>
			{/if}
			{#if profileSuccess}
				<p class="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">{profileSuccess}</p>
			{/if}
			<button
				type="submit"
				disabled={profileLoading}
				class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
			>Save Profile</button>
		</form>
	</div>
{/if}

<!-- Password tab -->
{#if activeTab === 'password'}
	<div class="max-w-md">
		<form onsubmit={changePassword} class="space-y-4" novalidate>
			<div>
				<label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1" for="settings-current-password">Current Password</label>
				<input
					id="settings-current-password"
					type="password"
					autocomplete="current-password"
					bind:value={currentPassword}
					class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
				/>
			</div>
			<div>
				<label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1" for="settings-new-password">New Password</label>
				<input
					id="settings-new-password"
					type="password"
					autocomplete="new-password"
					bind:value={newPassword}
					class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
				/>
				<p class="text-xs text-gray-400 mt-1">Minimum 8 characters.</p>
			</div>
			{#if passwordError}
				<p class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{passwordError}</p>
			{/if}
			{#if passwordSuccess}
				<p class="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">{passwordSuccess}</p>
			{/if}
			<button
				type="submit"
				disabled={passwordLoading}
				class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
			>Change Password</button>
		</form>
	</div>
{/if}

<!-- Preferences tab -->
{#if activeTab === 'preferences'}
	<div class="max-w-md space-y-4">
		<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Progress Tracking</h2>
		<div class="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
			<div class="flex-1">
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="pref-apply-equivalent">Apply status to equivalent controls</label>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">When marking a control's progress, also apply the same status to all equivalent controls across other frameworks.</p>
			</div>
			<div class="shrink-0 mt-0.5">
				<input
					type="checkbox"
					id="pref-apply-equivalent"
					bind:checked={prefApplyEquivalent}
					onchange={() => setPreference('applyToEquivalent', prefApplyEquivalent)}
					class="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
				/>
			</div>
		</div>
	</div>
{/if}

<!-- API Keys tab -->
{#if activeTab === 'apikeys'}
	<div class="mb-4 flex items-center gap-3">
		<h2 class="font-semibold text-sm">Your API Keys</h2>
		<button
			class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
			onclick={() => { showNewKeyForm = true; revealedKey = ''; }}
		>+ New Key</button>
	</div>

	{#if showNewKeyForm}
		<div class="mb-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 max-w-md">
			<div class="space-y-3">
				<div>
					<label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1" for="apikey-name">Key Name (optional)</label>
					<input
						id="apikey-name"
						type="text"
						maxlength="80"
						placeholder="e.g. My integration"
						bind:value={newKeyName}
						class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
					/>
				</div>
				<div class="flex gap-2">
					<button
						disabled={newKeyLoading}
						class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-60"
						onclick={createApiKey}
					>Create</button>
					<button
						class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
						onclick={() => (showNewKeyForm = false)}
					>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	{#if revealedKey}
		<div class="mb-4 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 max-w-lg">
			<p class="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">✓ API key created — copy it now, it will not be shown again:</p>
			<div class="flex items-center gap-2">
				<code class="flex-1 font-mono text-xs bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded px-2 py-1.5 break-all">{revealedKey}</code>
				<button
					class="shrink-0 px-2 py-1.5 rounded border border-green-300 dark:border-green-700 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900 transition"
					onclick={copyKey}
				>Copy</button>
			</div>
		</div>
	{/if}

	{#if apiKeysError}
		<p class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-3 max-w-md">{apiKeysError}</p>
	{/if}

	<div class="max-w-2xl space-y-2">
		{#if apiKeys.length === 0}
			<p class="text-sm text-gray-400 py-4 text-center">No API keys yet. Create one to access the API programmatically.</p>
		{:else}
			{#each apiKeys as k}
				<div class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
					<div class="flex-1 min-w-0">
						<p class="font-medium text-sm truncate">{k.name || 'Unnamed key'}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{k.keyPrefix}••••••••••••••</p>
						<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
							Created {new Date(k.createdAt).toLocaleDateString()}{k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ''}
						</p>
					</div>
					<button
						class="shrink-0 px-2 py-1 rounded border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition"
						onclick={() => deleteApiKey(k.id)}
					>Revoke</button>
				</div>
			{/each}
		{/if}
	</div>
{/if}
