# SvelteKit + Cloudflare Pages Library Testing Template

## Repository Structure

```
sveltekit-cf-lib-test-template/
├── README.md                     # Usage instructions
├── package.json                  # Base dependencies (exact CF-compatible versions)
├── svelte.config.js             # Standard CF adapter config
├── vite.config.js               # Minimal vite config
├── tsconfig.json                # TypeScript config
├── src/
│   ├── app.html                 # With hydration monitoring
│   ├── routes/
│   │   ├── +layout.svelte       # Minimal layout
│   │   ├── +layout.js           # SSR config
│   │   ├── +page.svelte         # Main test component
│   │   ├── +page.js             # Route config
│   │   └── test/
│   │       ├── +page.svelte     # Extended test scenarios
│   │       └── +page.js
│   └── lib/
│       └── TestHarness.svelte   # Reusable test component
├── tests/
│   ├── hydration-test.js        # Playwright hydration test
│   ├── ssr-consistency-test.js  # SSR vs client comparison
│   └── performance-test.js      # Bundle size & load time tests
├── scripts/
│   ├── test-library.sh          # Automated test runner
│   ├── deploy-test.sh           # CF Pages deployment
│   └── cleanup.sh               # Remove test deployments
└── docs/
    ├── USAGE.md                 # How to test a library
    ├── RESULTS_TEMPLATE.md      # Standard results format
    └── LIBRARY_DATABASE.md      # Tested libraries catalog
```

## Key Files Content

### package.json (Base Template)
```json
{
  "name": "sveltekit-cf-lib-test",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "test": "./scripts/test-library.sh",
    "deploy": "./scripts/deploy-test.sh",
    "cleanup": "./scripts/cleanup.sh"
  },
  "devDependencies": {
    "@sveltejs/adapter-cloudflare": "^4.6.0",
    "@sveltejs/kit": "^2.12.0",
    "@sveltejs/vite-plugin-svelte": "^3.1.1",
    "svelte": "^4.2.18",
    "svelte-check": "^3.8.4",
    "typescript": "^5.0.0",
    "vite": "^5.3.5",
    "wrangler": "^3.67.1",
    "playwright": "^1.40.0"
  },
  "dependencies": {
    "// ADD TARGET LIBRARY HERE": ""
  }
}
```

### src/routes/+page.svelte (Test Component)
```svelte
<script>
  import { onMount, tick } from 'svelte';
  import TestHarness from '$lib/TestHarness.svelte';
  // import { LibraryComponent } from 'TARGET_LIBRARY';
  
  let mounted = false;
  let hydrationTime = null;
  let interactionCount = 0;
  let testResults = {
    hydration: 'pending',
    interactivity: 'pending',
    ssr_consistency: 'pending',
    errors: []
  };
  
  const startTime = performance.now();
  
  onMount(async () => {
    hydrationTime = performance.now() - startTime;
    mounted = true;
    testResults.hydration = 'success';
    
    console.log('✅ HYDRATION SUCCESS');
    console.log(`⏱️ Hydration time: ${hydrationTime.toFixed(2)}ms`);
    
    // Test tick functionality
    await tick();
    console.log('✅ SVELTE TICK SUCCESS');
    
    // Report results
    reportResults();
  });
  
  function handleInteraction() {
    interactionCount++;
    testResults.interactivity = 'success';
    console.log(`✅ INTERACTIVITY SUCCESS (${interactionCount})`);
    reportResults();
  }
  
  function reportResults() {
    // Send results to monitoring endpoint or console
    console.log('📊 TEST RESULTS:', testResults);
  }
</script>

<svelte:head>
  <title>Library Test: TARGET_LIBRARY</title>
</svelte:head>

<main>
  <h1>🧪 SvelteKit + CF Library Test</h1>
  
  <TestHarness 
    {mounted} 
    {hydrationTime} 
    {interactionCount}
    {testResults}
    on:interact={handleInteraction}
  />
  
  <!-- REPLACE WITH TARGET LIBRARY COMPONENT -->
  <div class="library-test-area">
    <h2>Library Component Test</h2>
    <p>Replace this section with your target library components</p>
    <!-- <LibraryComponent prop1="test" prop2={123} /> -->
  </div>
  
  <!-- Multiple rendering contexts -->
  <div class="context-tests">
    <h3>Context Tests</h3>
    <!-- Test same component in different contexts -->
  </div>
</main>
```

### tests/hydration-test.js (Playwright Test)
```javascript
import { chromium } from 'playwright';

export async function testLibraryHydration(url, libraryName) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const results = {
    library: libraryName,
    url: url,
    hydration: false,
    interactivity: false,
    console_errors: [],
    performance: {}
  };
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.console_errors.push(msg.text());
    }
  });
  
  try {
    const startTime = performance.now();
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for potential hydration
    await page.waitForTimeout(5000);
    
    // Check hydration status
    const hydrationStatus = await page.evaluate(() => {
      return {
        mounted: document.querySelector('[data-testid="mounted"]')?.textContent?.includes('✅'),
        sveltekit_defined: typeof window.__SVELTEKIT__ !== 'undefined',
        has_console_success: true // We'll track this via console listener
      };
    });
    
    results.hydration = hydrationStatus.mounted;
    
    // Test interactivity
    await page.click('[data-testid="interaction-button"]');
    await page.waitForTimeout(1000);
    
    const interactionWorked = await page.evaluate(() => {
      return document.querySelector('[data-testid="interaction-count"]')?.textContent !== '0';
    });
    
    results.interactivity = interactionWorked;
    results.performance.total_time = performance.now() - startTime;
    
  } catch (error) {
    results.console_errors.push(error.message);
  } finally {
    await browser.close();
  }
  
  return results;
}
```

### scripts/test-library.sh
```bash
#!/bin/bash

LIBRARY_NAME=$1
if [ -z "$LIBRARY_NAME" ]; then
  echo "Usage: ./test-library.sh <library-name>"
  exit 1
fi

echo "🧪 Testing library: $LIBRARY_NAME"

# Install the library
echo "📦 Installing $LIBRARY_NAME..."
npm install "$LIBRARY_NAME"

# Build
echo "🔨 Building..."
npm run build

# Deploy to test Pages project
echo "🚀 Deploying to CF Pages..."
PROJECT_NAME="lib-test-$(echo $LIBRARY_NAME | tr '/' '-' | tr '@' '')"
wrangler pages deploy .svelte-kit/cloudflare --project-name="$PROJECT_NAME"

# Get deployment URL (you'd need to parse this from wrangler output)
DEPLOYMENT_URL="https://${PROJECT_NAME}-xxx.pages.dev"

# Run tests
echo "🧪 Running automated tests..."
node tests/hydration-test.js "$DEPLOYMENT_URL" "$LIBRARY_NAME"

echo "✅ Testing complete for $LIBRARY_NAME"
```

## Usage Instructions

1. **Clone template**: `git clone sveltekit-cf-lib-test-template my-library-test`
2. **Install target library**: `npm install target-library`
3. **Update test components**: Add library components to +page.svelte
4. **Run tests**: `npm run test target-library`
5. **Document results**: Update LIBRARY_DATABASE.md