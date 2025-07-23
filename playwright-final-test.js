#!/usr/bin/env node

const { chromium } = require('playwright');

async function finalTest() {
  console.log('🎭 Running final Playwright test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Enable verbose console logging
  page.on('console', msg => {
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  
  // Log errors
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });
  
  // Log failed requests
  page.on('requestfailed', request => {
    console.error('❌ Request Failed:', request.url());
  });
  
  console.log('📍 Navigating to: https://aiagent-demo-cqf.pages.dev/\n');
  
  // Navigate to the page
  await page.goto('https://aiagent-demo-cqf.pages.dev/', {
    waitUntil: 'networkidle'
  });
  
  console.log('⏳ Waiting for potential JavaScript execution...\n');
  await page.waitForTimeout(3000);
  
  // Check if SvelteKit is loaded
  const svelteKitStatus = await page.evaluate(() => {
    return {
      hasSvelteKit: typeof window.__sveltekit !== 'undefined',
      hasVite: typeof window.__vite !== 'undefined',
      documentReady: document.readyState,
      hasAppElement: !!document.querySelector('#svelte'),
      scriptTags: Array.from(document.querySelectorAll('script')).map(s => ({
        src: s.src,
        type: s.type,
        hasContent: !!s.textContent
      }))
    };
  });
  
  console.log('🔍 SvelteKit Status:');
  console.log(JSON.stringify(svelteKitStatus, null, 2));
  
  // Try to manually execute the loadAssistants function
  console.log('\n🔧 Attempting to manually load assistants...\n');
  
  const manualLoad = await page.evaluate(async () => {
    const AUTH_TOKEN = 'demo-secret-token';
    const API_BASE = 'https://ai-agent-demo.agileworks.workers.dev';
    
    try {
      console.log('Manual: Fetching assistants...');
      const response = await fetch(`${API_BASE}/api/assistants`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      });
      
      const data = await response.json();
      console.log('Manual: Response received:', data);
      
      // Try to update the DOM manually
      const spinnerEl = document.querySelector('.loading-assistants');
      const selectEl = document.querySelector('select#assistant');
      
      if (spinnerEl && data.assistants && data.assistants.length > 0) {
        // Hide spinner
        spinnerEl.style.display = 'none';
        
        // Create select if it doesn't exist
        if (!selectEl) {
          const container = spinnerEl.parentElement;
          const select = document.createElement('select');
          select.id = 'assistant';
          data.assistants.forEach(assistant => {
            const option = document.createElement('option');
            option.value = assistant.id;
            option.textContent = `${assistant.name} ${assistant.model ? `(${assistant.model})` : ''}`;
            select.appendChild(option);
          });
          container.appendChild(select);
        }
      }
      
      return {
        success: true,
        assistantCount: data.assistants.length,
        domUpdated: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  console.log('Manual load result:', JSON.stringify(manualLoad, null, 2));
  
  // Check final DOM state
  const finalState = await page.evaluate(() => {
    const spinner = document.querySelector('.loading-assistants');
    const select = document.querySelector('select#assistant');
    
    return {
      spinnerVisible: spinner ? window.getComputedStyle(spinner).display !== 'none' : false,
      selectExists: !!select,
      selectOptions: select ? Array.from(select.options).map(o => o.textContent) : []
    };
  });
  
  console.log('\n📊 Final DOM State:');
  console.log(JSON.stringify(finalState, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: 'playwright-final-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved: playwright-final-screenshot.png');
  
  console.log('\n⚠️  Analysis:');
  console.log('The frontend JavaScript appears to not be executing properly.');
  console.log('The API works fine when called manually, but the Svelte component');
  console.log('is not mounting or executing its onMount function.');
  console.log('\nPossible causes:');
  console.log('1. JavaScript bundle not loading correctly');
  console.log('2. SvelteKit hydration issue');
  console.log('3. Build/deployment issue with the frontend');
  
  console.log('\n🔍 Browser window will remain open for inspection.');
  console.log('Check the Console and Network tabs in DevTools.');
  console.log('Press Ctrl+C to exit.\n');
  
  // Keep browser open
  await new Promise(() => {});
}

finalTest().catch(console.error);