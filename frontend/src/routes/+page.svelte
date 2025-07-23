<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Phone, Loader2 } from 'lucide-svelte';
	
	let phoneNumber = '';
	let selectedAssistantId = '';
	let assistants = [];
	let loading = false;
	let loadingAssistants = true;
	let error = '';
	
	// Demo auth token - in production use proper auth
	const AUTH_TOKEN = 'demo-secret-token';
	const API_BASE = import.meta.env.DEV 
		? 'http://localhost:8787' 
		: 'https://ai-agent-demo.agileworks.workers.dev';
	
	onMount(async () => {
		console.log('🚀 Telnyx AI Demo - Loading assistants...');
		await loadAssistants();
	});
	
	async function loadAssistants() {
		try {
			const response = await fetch(`${API_BASE}/api/assistants`, {
				headers: {
					'Authorization': `Bearer ${AUTH_TOKEN}`
				}
			});
			
			if (!response.ok) {
				throw new Error('Failed to load AI assistants');
			}
			
			const data = await response.json();
			assistants = data.assistants || [];
			
			if (assistants.length > 0) {
				selectedAssistantId = assistants[0].id;
			}
		} catch (err) {
			console.error('Error loading assistants:', err);
			error = 'Failed to load AI assistants. Please check your Telnyx configuration.';
		} finally {
			loadingAssistants = false;
		}
	}
	
	async function handleCall() {
		if (!phoneNumber || !selectedAssistantId) {
			error = 'Please enter phone number and select assistant';
			return;
		}
		
		loading = true;
		error = '';
		
		const selectedAssistant = assistants.find(a => a.id === selectedAssistantId);
		
		try {
			const response = await fetch(`${API_BASE}/api/calls/initiate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${AUTH_TOKEN}`
				},
				body: JSON.stringify({
					phoneNumber,
					assistantId: selectedAssistantId,
					assistantName: selectedAssistant?.name
				})
			});
			
			const data = await response.json();
			
			if (!response.ok) {
				throw new Error(data.error || 'Failed to initiate call');
			}
			
			// Navigate to call details page
			goto(`/calls/${data.sessionId}`);
		} catch (err) {
			console.error('Error initiating call:', err);
			error = err.message || 'Failed to initiate call. Please try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Telnyx AI Voice Demo</title>
</svelte:head>

<div class="container">
	<div class="hero">
		<h1>AI Voice Call Demo</h1>
		<p>Initiate an AI-powered voice call using Telnyx. Configure the AI personality and conversation goal.</p>
	</div>

	<div class="call-form card">
		<form on:submit|preventDefault={handleCall}>
			<div class="input-group">
				<label for="phone">Phone Number</label>
				<input 
					id="phone"
					type="tel" 
					bind:value={phoneNumber} 
					placeholder="+1234567890"
					required
				/>
				<small>Include country code (e.g., +1 for US)</small>
			</div>
			
			<div class="input-group">
				<label for="assistant">AI Assistant</label>
				{#if loadingAssistants}
					<div class="loading-assistants">
						<Loader2 size={20} class="animate-spin" />
						Loading AI assistants...
					</div>
				{:else if assistants.length === 0}
					<div class="no-assistants">
						<Phone size={20} />
						No AI assistants found. Please create one in the Telnyx portal.
					</div>
				{:else}
					<select id="assistant" bind:value={selectedAssistantId} required>
						{#each assistants as assistant}
							<option value={assistant.id}>
								{assistant.name}
								{#if assistant.model}
									({assistant.model})
								{/if}
							</option>
						{/each}
					</select>
					{#if selectedAssistantId}
						{@const selectedAssistant = assistants.find(a => a.id === selectedAssistantId)}
						{#if selectedAssistant?.description}
							<small>{selectedAssistant.description}</small>
						{/if}
						{#if selectedAssistant?.instructions}
							<details class="assistant-details">
								<summary>View assistant instructions</summary>
								<pre>{selectedAssistant.instructions}</pre>
							</details>
						{/if}
					{/if}
				{/if}
			</div>

			{#if error}
				<div class="error-message">
					<Phone size={16} />
					{error}
				</div>
			{/if}
			
			<button type="submit" disabled={loading || !phoneNumber || !selectedAssistantId || loadingAssistants} class="btn btn-primary">
				{#if loading}
					<Loader2 size={20} class="animate-spin" />
					Initiating Call...
				{:else}
					<Phone size={20} />
					Start AI Call
				{/if}
			</button>
		</form>
	</div>

	<div class="info card">
		<h3>How it works</h3>
		<ol>
			<li>Enter the phone number you want the AI to call</li>
			<li>Select one of your pre-configured AI assistants</li>
			<li>Click "Start AI Call" to initiate the conversation</li>
			<li>Monitor the call progress and view transcripts in real-time</li>
		</ol>
		<p class="note">
			<strong>Note:</strong> This is a demo application. Calls will be recorded and transcribed for demonstration purposes.
		</p>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #f5f5f7;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.hero {
		text-align: center;
		margin-bottom: 3rem;
	}

	.hero h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		color: #1a1a1a;
	}

	.hero p {
		font-size: 1.1rem;
		color: #666;
		max-width: 600px;
		margin: 0 auto;
	}

	.card {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.call-form form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input-group label {
		font-weight: 600;
		color: #333;
	}

	.input-group input,
	.input-group select {
		padding: 0.75rem;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.input-group input:focus,
	.input-group select:focus {
		outline: none;
		border-color: #2563eb;
	}

	.input-group small {
		color: #666;
		font-size: 0.875rem;
	}

	.loading-assistants,
	.no-assistants {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: #f5f5f7;
		border-radius: 8px;
		color: #666;
	}

	.assistant-details {
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: #f5f5f7;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.assistant-details summary {
		cursor: pointer;
		font-weight: 500;
		color: #2563eb;
	}

	.assistant-details pre {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: white;
		border-radius: 4px;
		white-space: pre-wrap;
		font-size: 0.8rem;
		color: #666;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		color: #d00;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #2563eb;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.info h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #1a1a1a;
	}

	.info ol {
		margin: 0 0 1rem 1.5rem;
		padding: 0;
		color: #666;
		line-height: 1.8;
	}

	.info li {
		margin-bottom: 0.5rem;
	}

	.note {
		margin: 0;
		padding: 1rem;
		background: #f5f5f7;
		border-radius: 8px;
		font-size: 0.875rem;
		color: #666;
	}

	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>