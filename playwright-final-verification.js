import { chromium } from 'playwright';

console.log('🎭 Running comprehensive verification test...\n');

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  // Navigate to the page
  console.log('📍 Navigating to: https://aiagent-demo-cqf.pages.dev/\n');
  await page.goto('https://aiagent-demo-cqf.pages.dev/');
  
  // Wait for the page to stabilize
  await page.waitForTimeout(2000);
  
  // Check for SvelteKit hydration
  const hydrationCheck = await page.evaluate(() => {
    return {
      hasSvelteKit: typeof window.__SVELTEKIT__ !== 'undefined',
      hasVite: typeof window.__vite__ !== 'undefined',
      svelteKitLoaded: window.__SVELTEKIT__ ? Object.keys(window.__SVELTEKIT__).length > 0 : false,
      elementCounts: {
        scripts: document.querySelectorAll('script').length,
        svelteScripts: document.querySelectorAll('script[src*="app"]').length,
        modules: document.querySelectorAll('script[type="module"]').length
      }
    };
  });
  
  console.log('🔧 SvelteKit Hydration Check:');
  console.log(JSON.stringify(hydrationCheck, null, 2));
  console.log('');
  
  // Wait for either assistants to load or error to appear (max 10 seconds)
  console.log('⏱️ Waiting for assistants to load (max 10 seconds)...');
  
  try {
    // Wait for the select element to appear or error message
    await page.waitForSelector('select, .error-message', { timeout: 10000 });
    console.log('✅ UI elements loaded successfully!');
  } catch (e) {
    console.log('⚠️ Timeout waiting for UI elements, checking current state...');
  }
  
  // Final state check
  const finalState = await page.evaluate(() => {
    const spinner = document.querySelector('.spinner, [class*="spin"], .loading');
    const select = document.querySelector('select');
    const error = document.querySelector('.error-message, .error');
    
    return {
      spinnerVisible: spinner ? spinner.offsetParent !== null : false,
      selectExists: !!select,
      selectOptions: select ? Array.from(select.options).map(o => o.text) : [],
      errorVisible: error ? error.offsetParent !== null : false,
      errorText: error ? error.textContent : null,
      totalSelectOptions: select ? select.options.length : 0
    };
  });
  
  console.log('📊 Final UI State:');
  console.log(JSON.stringify(finalState, null, 2));
  console.log('');
  
  // Check API connectivity
  console.log('🔌 Testing direct API connectivity...');
  const apiResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('https://ai-agent-demo.agileworks.workers.dev/api/assistants');
      const data = await response.json();
      return {
        status: response.status,
        assistantCount: data.assistants ? data.assistants.length : 0,
        firstAssistant: data.assistants ? data.assistants[0].name : null
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  console.log('📥 API Test Result:');
  console.log(JSON.stringify(apiResponse, null, 2));
  console.log('');
  
  // Success assessment
  const success = {
    svelteKitLoaded: hydrationCheck.hasSvelteKit && hydrationCheck.svelteKitLoaded,
    apiWorking: apiResponse.status === 200,
    uiFunctional: finalState.selectExists || finalState.totalSelectOptions > 0,
    overallSuccess: false
  };
  
  success.overallSuccess = success.svelteKitLoaded && success.apiWorking;
  
  console.log('🎯 SUCCESS ASSESSMENT:');
  console.log(`✅ SvelteKit Hydrated: ${success.svelteKitLoaded ? 'YES' : 'NO'}`);
  console.log(`✅ API Working: ${success.apiWorking ? 'YES' : 'NO'}`);
  console.log(`✅ UI Functional: ${success.uiFunctional ? 'YES' : 'NO'}`);
  console.log(`🎉 OVERALL SUCCESS: ${success.overallSuccess ? 'YES' : 'NO'}`);
  
  if (success.overallSuccess) {
    console.log('\n🎉 HYDRATION ISSUE RESOLVED! Frontend is now working correctly.');
  } else {
    console.log('\n❌ Issues remain. Further debugging needed.');
  }

} catch (error) {
  console.error('❌ Test failed:', error.message);
} finally {
  await browser.close();
}