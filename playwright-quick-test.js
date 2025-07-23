#!/usr/bin/env node

const { chromium } = require('playwright');

async function quickTest() {
  console.log('🎭 Running quick Playwright test...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Collect console messages
  page.on('console', msg => {
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  
  // Collect errors
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });
  
  // Intercept API responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/assistants')) {
      console.log(`\n📥 API Response intercepted:`);
      console.log(`URL: ${url}`);
      console.log(`Status: ${response.status()}`);
      try {
        const body = await response.json();
        console.log(`Body:`, JSON.stringify(body, null, 2));
      } catch {
        console.log(`Body: [unable to parse]`);
      }
    }
  });
  
  console.log('📍 Navigating to: https://aiagent-demo-cqf.pages.dev/\n');
  
  await page.goto('https://aiagent-demo-cqf.pages.dev/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  // Wait for potential API call
  await page.waitForTimeout(5000);
  
  // Check the DOM state
  const domState = await page.evaluate(() => {
    const spinnerEl = document.querySelector('.loading-assistants');
    const selectEl = document.querySelector('select#assistant');
    const errorEl = document.querySelector('.error-message');
    
    return {
      spinnerVisible: spinnerEl ? window.getComputedStyle(spinnerEl).display !== 'none' : false,
      selectExists: !!selectEl,
      selectOptions: selectEl ? Array.from(selectEl.options).map(o => o.textContent) : [],
      errorVisible: errorEl ? window.getComputedStyle(errorEl).display !== 'none' : false,
      errorText: errorEl ? errorEl.textContent : null
    };
  });
  
  console.log('\n📊 DOM State:');
  console.log(JSON.stringify(domState, null, 2));
  
  // Try to manually call the API from the page context
  console.log('\n🔧 Manually calling API from page context...');
  const manualCall = await page.evaluate(async () => {
    try {
      const response = await fetch('https://ai-agent-demo.agileworks.workers.dev/api/assistants', {
        headers: {
          'Authorization': 'Bearer demo-secret-token'
        }
      });
      return {
        status: response.status,
        data: await response.json()
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  console.log('\nManual API call result:');
  console.log(JSON.stringify(manualCall, null, 2));
  
  await browser.close();
  console.log('\n✅ Test complete');
}

quickTest().catch(console.error);