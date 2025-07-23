<script>
	import '../app.css';
	import { page } from '$app/stores';
</script>

<div class="app">
	<header>
		<nav class="container">
			<a href="/" class="logo">
				<h1>Telnyx AI Voice Demo</h1>
			</a>
			<div class="nav-links">
				<a href="/" class:active={$page.url.pathname === '/'}>New Call</a>
				<a href="/calls" class:active={$page.url.pathname === '/calls'}>Call History</a>
			</div>
		</nav>
	</header>

	<main>
		<slot />
	</main>

	<footer>
		<div class="container">
			<p>&copy; 2024 Dialogworks AI low latency demo. Crafted by Agileworks</p>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	header {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		padding: 1rem 0;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.logo h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.logo {
		text-decoration: none;
	}

	.nav-links {
		display: flex;
		gap: 2rem;
	}

	.nav-links a {
		color: var(--text-secondary);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s;
	}

	.nav-links a:hover,
	.nav-links a.active {
		color: var(--primary);
	}

	main {
		flex: 1;
		padding: 2rem 0;
	}

	footer {
		background: var(--surface);
		border-top: 1px solid var(--border);
		padding: 1rem 0;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
</style>