#!/usr/bin/env node

const { chromium } = require('playwright');

async function debugFrontend() {
  console.log('🎭 Starting Playwright debug session...\n');
  
  const browser = await chromium.launch({
    headless: false, // Show the browser
    devtools: true   // Open DevTools automatically
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    };
    consoleLogs.push(logEntry);
    console.log(`[${logEntry.type.toUpperCase()}] ${logEntry.text}`);
  });
  
  // Collect errors
  const errors = [];
  page.on('pageerror', error => {
    const errorEntry = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    errors.push(errorEntry);
    console.error('❌ Page Error:', error.message);
  });
  
  // Intercept network requests
  const networkRequests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      console.log(`📤 API Request: ${request.method()} ${url}`);
      networkRequests.push({
        url,
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log(`📥 API Response: ${response.status()} ${url}`);
    }
  });
  
  console.log('📍 Navigating to: https://aiagent-demo-cqf.pages.dev/\n');
  
  try {
    // Navigate and wait for network to be idle
    await page.goto('https://aiagent-demo-cqf.pages.dev/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ Page loaded\n');
    
    // Wait a bit to see if the component mounts
    await page.waitForTimeout(3000);
    
    // Check for loading spinner
    const spinnerVisible = await page.locator('.loading-assistants').isVisible().catch(() => false);
    console.log(`⏳ Loading spinner visible: ${spinnerVisible}\n`);
    
    // Check for error message
    const errorVisible = await page.locator('.error-message').isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.locator('.error-message').textContent();
      console.log(`❌ Error message found: ${errorText}\n`);
    }
    
    // Check for assistants dropdown
    const selectVisible = await page.locator('select#assistant').isVisible().catch(() => false);
    console.log(`📋 Assistant dropdown visible: ${selectVisible}`);
    
    if (selectVisible) {
      const options = await page.locator('select#assistant option').allTextContents();
      console.log(`📋 Assistant options found: ${options.length}`);
      options.forEach((opt, i) => console.log(`   ${i + 1}. ${opt}`));
    }
    
    // Execute JavaScript in the page context to check component state
    console.log('\n🔍 Checking component state...\n');
    
    const componentState = await page.evaluate(() => {
      // Try to access Svelte component state
      const appElement = document.querySelector('#svelte');
      const formElement = document.querySelector('form');
      
      return {
        appElementExists: !!appElement,
        formElementExists: !!formElement,
        documentTitle: document.title,
        bodyClasses: document.body.className,
        hasLoadingElements: document.querySelectorAll('.loading-assistants, [class*="load"], [class*="spin"]').length,
        hasErrorElements: document.querySelectorAll('.error-message, [class*="error"]').length,
        selectElement: !!document.querySelector('select#assistant'),
        selectOptions: Array.from(document.querySelectorAll('select#assistant option')).map(o => o.textContent)
      };
    });
    
    console.log('Component state:', JSON.stringify(componentState, null, 2));
    
    // Try to intercept the fetch call
    console.log('\n🔍 Intercepting API calls...\n');
    
    const apiResponse = await page.waitForResponse(
      response => response.url().includes('/api/assistants'),
      { timeout: 5000 }
    ).catch(async () => {
      console.log('⚠️  No API call detected within 5 seconds');
      
      // Try to manually trigger the API call
      console.log('\n🔧 Attempting to manually trigger API call...\n');
      
      const manualResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('https://ai-agent-demo.agileworks.workers.dev/api/assistants', {
            headers: {
              'Authorization': 'Bearer demo-secret-token'
            }
          });
          const data = await response.json();
          return {
            status: response.status,
            data,
            headers: Object.fromEntries(response.headers)
          };
        } catch (error) {
          return {
            error: error.message,
            stack: error.stack
          };
        }
      });
      
      console.log('Manual API call result:', JSON.stringify(manualResponse, null, 2));
      return null;
    });
    
    if (apiResponse) {
      console.log(`✅ API call detected: ${apiResponse.status()} ${apiResponse.url()}`);
      const responseBody = await apiResponse.text();
      try {
        const data = JSON.parse(responseBody);
        console.log('API Response:', JSON.stringify(data, null, 2));
      } catch {
        console.log('API Response (raw):', responseBody);
      }
    }
    
    // Take a screenshot
    const screenshotPath = 'playwright-debug-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
    
    // Generate report
    console.log('\n📊 Debug Report:\n');
    console.log('==========================================');
    console.log(`Total console logs: ${consoleLogs.length}`);
    console.log(`Total errors: ${errors.length}`);
    console.log(`API requests made: ${networkRequests.filter(r => r.url.includes('/api/')).length}`);
    console.log('==========================================\n');
    
    if (errors.length > 0) {
      console.log('❌ Errors found:');
      errors.forEach((error, i) => {
        console.log(`\nError ${i + 1}:`);
        console.log(error.message);
        if (error.stack) {
          console.log(error.stack);
        }
      });
    }
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will remain open for manual inspection.');
    console.log('Press Ctrl+C to close.\n');
    
    // Wait indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the debug session
debugFrontend().catch(console.error);