<script>
	import { authFetch } from '$lib/api.js';
	import { user, token, persistAuth, dbEnabled } from '$lib/stores.js';
	import { get } from 'svelte/store';

	/** @type {{ open: boolean; mode?: 'signin' | 'signup'; onclose?: () => void; onsuccess?: (u: any) => void }} */
	let { open = false, mode = $bindable('signin'), onclose, onsuccess } = $props();

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	const isSignup = $derived(mode === 'signup');
	const title = $derived(isSignup ? 'Create Account' : 'Sign In');
	const submitLabel = $derived(isSignup ? 'Create Account' : 'Sign In');

	function handleOverlayClick(e) {
		if (e.target === e.currentTarget) onclose?.();
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') onclose?.();
	}

	async function handleSubmit(e) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const endpoint = isSignup ? '/auth/register' : '/auth/login';
			const result = await authFetch('POST', endpoint, { email: email.trim(), password });
			token.set(result.token);
			user.set(result.user);
			persistAuth(result.token, result.user);
			email = '';
			password = '';
			onclose?.();
			onsuccess?.(result.user);
		} catch (err) {
			error = err.message || 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby="auth-modal-title"
		onclick={handleOverlayClick}
	>
		<div
			class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700"
		>
			<div class="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
				<h2 id="auth-modal-title" class="font-bold text-lg">{title}</h2>
				<button
					class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"
					aria-label="Close"
					onclick={onclose}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<div class="p-5 space-y-4">
				<!-- Tab switcher -->
				<div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1">
					<button
						class="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors"
						class:bg-white={!isSignup}
						class:dark:bg-gray-950={!isSignup}
						class:shadow-sm={!isSignup}
						class:text-gray-900={!isSignup}
						class:dark:text-gray-100={!isSignup}
						class:text-gray-500={isSignup}
						class:dark:text-gray-400={isSignup}
						onclick={() => (mode = 'signin')}
					>Sign In</button>
					<button
						class="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors"
						class:bg-white={isSignup}
						class:dark:bg-gray-950={isSignup}
						class:shadow-sm={isSignup}
						class:text-gray-900={isSignup}
						class:dark:text-gray-100={isSignup}
						class:text-gray-500={!isSignup}
						class:dark:text-gray-400={!isSignup}
						onclick={() => (mode = 'signup')}
					>Sign Up</button>
				</div>

				<form onsubmit={handleSubmit} class="space-y-3" novalidate>
					<div>
						<label
							class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
							for="auth-email">Email</label
						>
						<input
							id="auth-email"
							type="email"
							autocomplete="email"
							required
							bind:value={email}
							class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
						/>
					</div>
					<div>
						<label
							class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
							for="auth-password">Password</label
						>
						<input
							id="auth-password"
							type="password"
							autocomplete={isSignup ? 'new-password' : 'current-password'}
							required
							bind:value={password}
							class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
						/>
						{#if isSignup}
							<p class="text-xs text-gray-400 mt-1">Minimum 8 characters.</p>
						{/if}
					</div>
					{#if error}
						<p
							class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
						>{error}</p>
					{/if}
					<button
						type="submit"
						disabled={loading}
						class="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
					>{submitLabel}</button>
				</form>
			</div>
		</div>
	</div>
{/if}
