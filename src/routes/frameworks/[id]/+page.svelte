<script>
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { frameworks, controlsData, mappings, progress, user } from '$lib/stores.js';
import { authFetch } from '$lib/api.js';
import { getContext } from 'svelte';
import FwBadge from '$lib/components/FwBadge.svelte';
import ProgressBadge from '$lib/components/ProgressBadge.svelte';
import Modal from '$lib/components/Modal.svelte';
import { PROGRESS_CYCLE, getPreferences, getDeduplicatedMappings, getFromControl } from '$lib/utils.js';

const loadProgress = getContext('loadProgress');

const fwId = $derived($page.params.id);
const fw = $derived($frameworks.find((f) => f.id === fwId));
const controls = $derived($controlsData[fwId] || []);

/** Controls grouped by category */
const controlsByCategory = $derived(() => {
const groups = {};
controls.forEach((c) => {
const g = c.category || 'Other';
if (!groups[g]) groups[g] = [];
groups[g].push(c);
});
return groups;
});

// Control-level modal (all mappings in framework table, clickable rows)
let controlModalOpen = $state(false);
let modalControl = $state(null);

// Specific mapping detail modal (source ↔ target)
let mappingModalOpen = $state(false);
/** @type {{ mapping: any, otherControl: any, fromRelationship: string, toRelationship: string, isAsymmetric: boolean } | null} */
let selectedEntry = $state(null);

function openControl(control) {
modalControl = control;
controlModalOpen = true;
}

function openMappingDetail(entry) {
selectedEntry = entry;
mappingModalOpen = true;
}

/** Deduplicated mappings for a control, grouped by other-framework id */
const modalMappingsByFw = $derived(() => {
if (!modalControl) return {};
const otherFws = $frameworks.filter((f) => f.id !== fwId);
const byFw = {};
otherFws.forEach((f) => { byFw[f.id] = []; });
const entries = getDeduplicatedMappings($mappings, modalControl.id);
entries.forEach((entry) => {
const otherFwId = entry.otherControl?.frameworkId;
if (!otherFwId || !byFw[otherFwId]) return;
byFw[otherFwId].push(entry);
});
return byFw;
});

const modalRelatedMappings = $derived(() => {
if (!modalControl) return [];
return getDeduplicatedMappings($mappings, modalControl.id);
});

async function handleProgressClick(controlId) {
if (!$user) return;
const current = $progress[controlId] || 'not_started';
const next = PROGRESS_CYCLE[(PROGRESS_CYCLE.indexOf(current) + 1) % PROGRESS_CYCLE.length];

const prefs = getPreferences();
const applyToEquivalent = prefs.applyToEquivalent !== false;

const equivalentIds = applyToEquivalent
? getEquivalentControlIds(controlId)
: [];
const idsToUpdate = [controlId, ...equivalentIds];

// Optimistic update
const prev = { ...$progress };
const updated = { ...$progress };
idsToUpdate.forEach((id) => { updated[id] = next; });
progress.set(updated);

try {
await Promise.all(
idsToUpdate.map((id) =>
authFetch('PUT', `/progress/${encodeURIComponent(id)}`, { status: next })
)
);
} catch {
progress.set(prev);
}
}

function getEquivalentControlIds(controlId) {
const ids = new Set();
$mappings.forEach((m) => {
if (m.relationship !== 'equivalent') return;
if (m.sourceControl?.id === controlId && m.targetControl) ids.add(m.targetControl.id);
else if (m.targetControl?.id === controlId && m.sourceControl) ids.add(m.sourceControl.id);
});
return Array.from(ids);
}

function getFwForControl(control) {
return control ? $frameworks.find((f) => f.id === control.frameworkId) : null;
}

const fwName = $derived(fw?.name ?? '');
</script>

<svelte:head>
<title>{fwName || 'Framework'} — Compliance Mapper</title>
</svelte:head>

<div class="mb-6">
<button
class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
onclick={() => goto('/frameworks')}
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
</svg>
Back to Frameworks
</button>

{#if fw}
<div class="flex items-center gap-3 mb-2">
<FwBadge {fw} />
<h1 class="text-2xl font-bold">{fw.name}</h1>
</div>

<div class="flex flex-wrap gap-3 text-xs mb-3">
{#if fw.version}
<span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
Version: <strong class="ml-0.5 text-gray-700 dark:text-gray-300">{fw.version}</strong>
</span>
{/if}
{#if fw.lastUpdated}
<span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
Last updated: <strong class="ml-0.5 text-gray-700 dark:text-gray-300">{fw.lastUpdated}</strong>
</span>
{/if}
{#if fw.url}
<a href={fw.url} target="_blank" rel="noopener noreferrer"
class="inline-flex items-center gap-1 font-medium hover:underline"
style="color:{fw.color}">
<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
Official source
</a>
{/if}
</div>

<p class="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-3xl">{fw.description}</p>

{#if fw.businessImpact}
<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-3">
<h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Business Impact</h2>
{#if Array.isArray(fw.businessImpact)}
<ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
{#each fw.businessImpact as pt}<li>{pt}</li>{/each}
</ul>
{:else}
<p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{fw.businessImpact}</p>
{/if}
</div>
{/if}

{#if fw.structure}
<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-4">
<h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Framework Structure</h2>
{#if Array.isArray(fw.structure)}
<ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
{#each fw.structure as pt}<li>{pt}</li>{/each}
</ul>
{:else}
<p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{fw.structure}</p>
{/if}
</div>
{/if}
{/if}
</div>

{#if !fw}
<p class="text-center text-gray-400 py-10">Framework not found.</p>
{:else if controls.length === 0}
<p class="text-center text-gray-400 py-10">Loading…</p>
{:else}
<p class="text-xs text-gray-400 dark:text-gray-500 mb-4">{controls.length} controls — click a control to see its cross-framework mappings</p>
{#each Object.entries(controlsByCategory()) as [category, ctrls]}
<div class="mb-6">
<h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{category}</h3>
<div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
{#each ctrls as control, i}
<div
class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors {i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}"
role="button"
tabindex="0"
onclick={(e) => { if (e.target.closest('.progress-btn')) return; openControl(control); }}
onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && openControl(control)}
>
<div class="shrink-0 mt-0.5">
<span class="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded" style="background:{fw.color}20;color:{fw.color}">{control.ref}</span>
</div>
<div class="min-w-0 flex-1">
<div class="font-semibold text-sm">{control.title}</div>
<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{control.description}</div>
{#if control.theme}
<span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mt-1.5 inline-block">{control.theme}</span>
{/if}
</div>
{#if $user}
<button
	class="shrink-0 bg-transparent border-0 p-0 cursor-pointer"
	aria-label="Toggle progress"
	onclick={(e) => { e.stopPropagation(); handleProgressClick(control.id); }}
>
	<ProgressBadge controlId={control.id} status={$progress[control.id] || 'not_started'} />
</button>
{/if}
<div class="shrink-0 self-center text-gray-400">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
</div>
</div>
{/each}
</div>
</div>
{/each}
{/if}

<!-- Control-level modal: all mappings grouped by framework -->
{#if modalControl}
{@const allMappings = modalRelatedMappings()}
{@const totalEquivalent = allMappings.filter((e) => e.fromRelationship === 'equivalent').length}
{@const totalRelated = allMappings.filter((e) => e.fromRelationship === 'related').length}
{@const byFw = modalMappingsByFw()}
{@const otherFws = $frameworks.filter((f) => f.id !== fwId)}
<Modal open={controlModalOpen} onclose={() => (controlModalOpen = false)}>
{#snippet title()}
<div>
<div class="flex items-center gap-2 flex-wrap">
{#if fw}<FwBadge {fw} />{/if}
<span class="font-mono font-bold">{modalControl.ref}</span>
{#if $user}
<button
	class="shrink-0 bg-transparent border-0 p-0 cursor-pointer"
	aria-label="Toggle progress"
	onclick={(e) => { e.stopPropagation(); handleProgressClick(modalControl.id); }}
>
	<ProgressBadge controlId={modalControl.id} status={$progress[modalControl.id] || 'not_started'} />
</button>
{/if}
</div>
<div class="text-base font-semibold mt-0.5">{modalControl.title}</div>
</div>
{/snippet}

<p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{modalControl.description}</p>
<div class="flex flex-wrap gap-2 mt-1">
{#if modalControl.theme}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{modalControl.theme}</span>{/if}
{#if modalControl.category}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{modalControl.category}</span>{/if}
</div>
<div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
<span class="font-semibold text-gray-700 dark:text-gray-300">{allMappings.length} mapping{allMappings.length !== 1 ? 's' : ''}</span>
{#if totalEquivalent > 0}<span class="flex items-center gap-1.5"><span class="mapping-sym equivalent" style="display:inline-flex">≡</span>{totalEquivalent} equivalent</span>{/if}
{#if totalRelated > 0}<span class="flex items-center gap-1.5"><span class="mapping-sym related" style="display:inline-flex">~</span>{totalRelated} related</span>{/if}
</div>
<div class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
<table class="min-w-full text-sm">
<thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
<tr>
<th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Framework</th>
<th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mapped Control(s)</th>
<th class="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
</tr>
</thead>
<tbody class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950">
{#each otherFws as ofw}
{@const entries = byFw[ofw.id] || []}
{#if entries.length === 0}
<tr>
<td class="px-3 py-2.5"><FwBadge fw={ofw} /></td>
<td class="px-3 py-2.5 text-gray-400 text-xs">—</td>
<td class="px-3 py-2.5 text-center"><span class="mapping-sym none">—</span></td>
</tr>
{:else}
{#each entries as entry, i}
<tr
class="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
role="button"
tabindex="0"
onclick={() => openMappingDetail(entry)}
onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && openMappingDetail(entry)}
>
<td class="px-3 py-2.5">{#if i === 0}<FwBadge fw={ofw} />{/if}</td>
<td class="px-3 py-2.5">
<div class="font-mono font-semibold text-xs">{entry.otherControl.ref}</div>
<div class="text-xs text-gray-500 dark:text-gray-400">{entry.otherControl.title}</div>
</td>
<td class="px-3 py-2.5 text-center">
<span class="mapping-sym {entry.fromRelationship} {entry.isAsymmetric ? 'asymmetric' : ''}"
  title="{entry.fromRelationship === 'equivalent' ? 'Equivalent' : 'Related'}{entry.isAsymmetric ? ` (reverse: ${entry.toRelationship})` : ''}"
>{entry.fromRelationship === 'equivalent' ? '≡' : '~'}</span>
</td>
</tr>
{/each}
{/if}
{/each}
</tbody>
</table>
</div>
</Modal>
{/if}

<!-- Specific mapping detail modal (source ↔ target) -->
{#if selectedEntry}
{@const fromCtrl = getFromControl(selectedEntry)}
{@const toCtrl = selectedEntry.otherControl}
{@const fromFw = getFwForControl(fromCtrl)}
{@const toFw = getFwForControl(toCtrl)}
<Modal open={mappingModalOpen} title="Control Mapping Detail" onclose={() => (mappingModalOpen = false)}>
	<!-- Visual: FROM box — connector — TO box -->
	<div class="flex flex-col sm:flex-row items-stretch gap-3">
		<!-- FROM control box -->
		{#if fromCtrl}
			<div class="flex-1 rounded-xl border p-4" style="border-color:{fromFw?.color ?? '#6b7280'}40;background:{fromFw?.color ?? '#6b7280'}08">
				<p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:{fromFw?.color ?? '#6b7280'}">From {fromFw?.shortName ?? ''}</p>
				<p class="font-mono font-bold mt-2 text-sm">{fromCtrl.ref}</p>
				<p class="font-semibold mt-0.5 text-sm">{fromCtrl.title}</p>
				{#if fromCtrl.description}<p class="text-gray-600 dark:text-gray-400 mt-2 text-xs leading-relaxed">{fromCtrl.description}</p>{/if}
				<div class="flex flex-wrap gap-1 mt-3">
					{#if fromCtrl.theme}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{fromCtrl.theme}</span>{/if}
					{#if fromCtrl.category}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{fromCtrl.category}</span>{/if}
				</div>
				{#if selectedEntry.isAsymmetric && selectedEntry.fromNotes}
					<div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
						<p class="text-gray-700 dark:text-gray-300 text-sm">{selectedEntry.fromNotes}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Connector -->
		<div class="flex sm:flex-col items-center justify-center px-3 py-3 sm:py-0 sm:w-20 shrink-0 gap-4">
			<div class="flex items-center gap-2">
				<svg class="w-5 h-5 conn-arrow-{selectedEntry.fromRelationship}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
				<span title="{selectedEntry.fromRelationship}" class="text-xl font-bold leading-none cursor-help conn-arrow-{selectedEntry.fromRelationship}">{selectedEntry.fromRelationship === 'equivalent' ? '≡' : '~'}</span>
				<svg class="w-5 h-5 conn-arrow-{selectedEntry.fromRelationship}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
			</div>
			{#if selectedEntry.isAsymmetric}
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5 conn-arrow-{selectedEntry.toRelationship}" style="transform:rotate(180deg)" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
					<span title="{selectedEntry.toRelationship}" class="text-xl font-bold leading-none cursor-help conn-arrow-{selectedEntry.toRelationship}">{selectedEntry.toRelationship === 'equivalent' ? '≡' : '~'}</span>
					<svg class="w-5 h-5 conn-arrow-{selectedEntry.toRelationship}" style="transform:rotate(180deg)" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
				</div>
			{/if}
		</div>

		<!-- TO control box -->
		{#if toCtrl}
			<div class="flex-1 rounded-xl border p-4" style="border-color:{toFw?.color ?? '#6b7280'}40;background:{toFw?.color ?? '#6b7280'}08">
				<p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:{toFw?.color ?? '#6b7280'}">To {toFw?.shortName ?? ''}</p>
				<p class="font-mono font-bold mt-2 text-sm">{toCtrl.ref}</p>
				<p class="font-semibold mt-0.5 text-sm">{toCtrl.title}</p>
				{#if toCtrl.description}<p class="text-gray-600 dark:text-gray-400 mt-2 text-xs leading-relaxed">{toCtrl.description}</p>{/if}
				<div class="flex flex-wrap gap-1 mt-3">
					{#if toCtrl.theme}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{toCtrl.theme}</span>{/if}
					{#if toCtrl.category}<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{toCtrl.category}</span>{/if}
				</div>
				{#if selectedEntry.isAsymmetric && selectedEntry.toNotes}
					<div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
						<p class="text-gray-700 dark:text-gray-300 text-sm">{selectedEntry.toNotes}</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Rationale (symmetric) -->
	{#if !selectedEntry.isAsymmetric && selectedEntry.mapping.notes}
		<div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
			<p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rationale</p>
			<p class="text-gray-700 dark:text-gray-300">{selectedEntry.mapping.notes}</p>
		</div>
	{/if}
</Modal>
{/if}
