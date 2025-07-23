import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// Force all routes to be handled by worker since prerendering is disabled
			routes: {
				include: ['/*'],
				exclude: ['/_app/*', '/debug.html']
			},
			platformProxy: {
				environment: undefined,
				experimentalJsonConfig: false,
				persist: false
			}
		})
	}
};

export default config;