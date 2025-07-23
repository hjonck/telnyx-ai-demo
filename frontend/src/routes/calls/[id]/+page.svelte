<script>
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { Phone, Clock, Download, Play, RefreshCw, AlertCircle } from 'lucide-svelte';
	
	let call = null;
	let loading = true;
	let error = '';
	let refreshInterval;
	
	const AUTH_TOKEN = 'demo-secret-token';
	const API_BASE = import.meta.env.DEV 
		? 'http://localhost:8787' 
		: 'https://ai-agent-demo.agileworks.workers.dev';
	
	async function loadCall() {
		try {
			const response = await fetch(`${API_BASE}/api/calls/${$page.params.id}`, {
				headers: {
					'Authorization': `Bearer ${AUTH_TOKEN}`
				}
			});
			
			const data = await response.json();
			
			if (!response.ok) {
				throw new Error(data.error || 'Failed to load call');
			}
			
			call = data;
			
			// Keep refreshing if call is in progress
			if (call.status === 'in_progress' || call.status === 'initiating') {
				if (!refreshInterval) {
					refreshInterval = setInterval(loadCall, 3000);
				}
			} else if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
	
	onMount(() => {
		loadCall();
	});
	
	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
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
</script>

<div class="container">
	{#if loading && !call}
		<div class="loading">
			<RefreshCw size={32} class="animate-spin" />
			<p>Loading call details...</p>
		</div>
	{:else if error}
		<div class="error-message">
			<AlertCircle size={20} />
			{error}
		</div>
	{:else if call}
		<div class="call-details">
			<div class="header">
				<div>
					<h1>{call.phone_number}</h1>
					<p class="date">{formatDate(call.created_at)}</p>
				</div>
				<span class="status-badge status-{call.status}">
					{#if call.status === 'in_progress'}
						<RefreshCw size={16} class="animate-spin" />
					{:else}
						<Phone size={16} />
					{/if}
					{call.status.replace('_', ' ')}
				</span>
			</div>
			
			<div class="info-grid">
				<div class="info-card card">
					<h3>Call Information</h3>
					<dl>
						<dt>Duration</dt>
						<dd>{formatDuration(call.duration)}</dd>
						
						<dt>Started At</dt>
						<dd>{formatDate(call.started_at)}</dd>
						
						{#if call.ended_at}
							<dt>Ended At</dt>
							<dd>{formatDate(call.ended_at)}</dd>
						{/if}
						
						<dt>Call ID</dt>
						<dd class="mono">{call.telnyx_call_id || '—'}</dd>
					</dl>
				</div>
				
				<div class="info-card card">
					<h3>AI Assistant</h3>
					<dl>
						<dt>Assistant</dt>
						<dd>{call.assistant_name || 'Unknown'}</dd>
						
						<dt>Assistant ID</dt>
						<dd class="mono">{call.assistant_id}</dd>
					</dl>
				</div>
			</div>
			
			{#if call.transcript}
				<div class="transcript card">
					<h3>Call Transcript</h3>
					<div class="transcript-content">
						{call.transcript}
					</div>
				</div>
			{:else if call.status === 'completed'}
				<div class="transcript card">
					<h3>Call Transcript</h3>
					<p class="empty-text">Transcript processing... Please refresh in a moment.</p>
				</div>
			{/if}
			
			{#if call.recording}
				<div class="recording card">
					<h3>Call Recording</h3>
					<div class="audio-player">
						<audio controls src={call.recording}>
							Your browser does not support the audio element.
						</audio>
						<a href={call.recording} download class="btn btn-secondary">
							<Download size={16} />
							Download Recording
						</a>
					</div>
				</div>
			{/if}
			
			{#if call.insights}
				<div class="insights card">
					<h3>AI Insights</h3>
					<div class="insights-content">
						{call.insights}
					</div>
				</div>
			{/if}
			
			{#if call.status === 'in_progress'}
				<div class="live-indicator">
					<span class="pulse"></span>
					Call in progress... Refreshing every 3 seconds
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem;
		color: var(--text-secondary);
	}
	
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: #fee2e2;
		color: #991b1b;
		border-radius: var(--radius);
	}
	
	.call-details {
		max-width: 800px;
		margin: 0 auto;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
	}
	
	.header h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}
	
	.date {
		color: var(--text-secondary);
	}
	
	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	
	@media (max-width: 768px) {
		.info-grid {
			grid-template-columns: 1fr;
		}
	}
	
	.info-card h3 {
		margin-bottom: 1rem;
	}
	
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem 1rem;
	}
	
	dt {
		font-weight: 600;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	
	dd {
		font-size: 0.875rem;
	}
	
	.mono {
		font-family: monospace;
		font-size: 0.75rem;
	}
	
	.transcript h3,
	.recording h3,
	.insights h3 {
		margin-bottom: 1rem;
	}
	
	.transcript-content,
	.insights-content {
		white-space: pre-wrap;
		line-height: 1.6;
		max-height: 400px;
		overflow-y: auto;
		padding: 1rem;
		background: var(--background);
		border-radius: var(--radius);
		border: 1px solid var(--border);
	}
	
	.empty-text {
		color: var(--text-secondary);
		font-style: italic;
	}
	
	.audio-player {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	
	.audio-player audio {
		flex: 1;
		min-width: 300px;
	}
	
	.live-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: #fef3c7;
		color: #92400e;
		border-radius: var(--radius);
		margin-top: 2rem;
	}
	
	.pulse {
		display: inline-block;
		width: 8px;
		height: 8px;
		background: #f59e0b;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}
	
	@keyframes pulse {
		0% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(1.2); }
		100% { opacity: 1; transform: scale(1); }
	}
	
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>