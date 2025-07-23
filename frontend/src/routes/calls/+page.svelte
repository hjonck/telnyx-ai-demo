<script>
	import { onMount } from 'svelte';
	import { Phone, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-svelte';
	
	let calls = [];
	let loading = true;
	let error = '';
	
	const AUTH_TOKEN = 'demo-secret-token';
	const API_BASE = import.meta.env.DEV 
		? 'http://localhost:8787' 
		: 'https://ai-agent-demo.agileworks.workers.dev';
	
	onMount(async () => {
		try {
			const response = await fetch(`${API_BASE}/api/calls`, {
				headers: {
					'Authorization': `Bearer ${AUTH_TOKEN}`
				}
			});
			
			const data = await response.json();
			
			if (!response.ok) {
				throw new Error(data.error || 'Failed to load calls');
			}
			
			calls = data.calls;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	});
	
	function formatDate(dateString) {
		return new Date(dateString).toLocaleString();
	}
	
	function formatDuration(seconds) {
		if (!seconds) return '—';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
	
	function getStatusIcon(status) {
		switch (status) {
			case 'completed':
				return CheckCircle;
			case 'failed':
				return XCircle;
			case 'in_progress':
				return Phone;
			default:
				return Clock;
		}
	}
</script>

<div class="container">
	<div class="header">
		<h1>Call History</h1>
		<a href="/" class="btn btn-primary">
			<Phone size={20} />
			New Call
		</a>
	</div>
	
	{#if loading}
		<div class="loading">
			<Loader2 size={32} class="animate-spin" />
			<p>Loading calls...</p>
		</div>
	{:else if error}
		<div class="error-message">
			{error}
		</div>
	{:else if calls.length === 0}
		<div class="empty-state card">
			<Phone size={48} />
			<h3>No calls yet</h3>
			<p>Start your first AI-powered call to see it here.</p>
			<a href="/" class="btn btn-primary">Make your first call</a>
		</div>
	{:else}
		<div class="calls-grid">
			{#each calls as call}
				<a href="/calls/{call.id}" class="call-card card">
					<div class="call-header">
						<div class="call-info">
							<h3>{call.phone_number}</h3>
							<p class="date">{formatDate(call.created_at)}</p>
						</div>
						<span class="status-badge status-{call.status}">
							<svelte:component this={getStatusIcon(call.status)} size={16} />
							{call.status.replace('_', ' ')}
						</span>
					</div>
					
					<div class="call-details">
						<div class="detail">
							<strong>Duration:</strong>
							{formatDuration(call.duration)}
						</div>
						<div class="detail">
							<strong>AI Assistant:</strong>
							<span class="truncate">{call.assistant_name || 'Unknown'}</span>
						</div>
					</div>
					
					{#if call.transcript}
						<div class="transcript-preview">
							<strong>Transcript:</strong>
							<p class="truncate">{call.transcript}</p>
						</div>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}
	
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem;
		color: var(--text-secondary);
	}
	
	.error-message {
		padding: 1rem;
		background: #fee2e2;
		color: #991b1b;
		border-radius: var(--radius);
		text-align: center;
	}
	
	.empty-state {
		text-align: center;
		padding: 4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: var(--text-secondary);
	}
	
	.empty-state h3 {
		color: var(--text-primary);
		margin-top: 1rem;
	}
	
	.calls-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}
	
	.call-card {
		display: block;
		text-decoration: none;
		color: inherit;
		transition: transform 0.2s, box-shadow 0.2s;
	}
	
	.call-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
	}
	
	.call-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	
	.call-info h3 {
		font-size: 1.125rem;
		margin-bottom: 0.25rem;
	}
	
	.date {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	
	.call-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}
	
	.detail {
		display: flex;
		gap: 0.5rem;
	}
	
	.detail strong {
		flex-shrink: 0;
	}
	
	.transcript-preview {
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		font-size: 0.875rem;
	}
	
	.transcript-preview strong {
		display: block;
		margin-bottom: 0.5rem;
	}
	
	.transcript-preview p {
		color: var(--text-secondary);
		line-height: 1.4;
	}
	
	.truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>