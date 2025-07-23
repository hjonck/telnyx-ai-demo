import { chromium } from 'playwright';

console.log('🎭 Debugging console output...\n');

const browser = await chromium.launch();
const page = await browser.newPage();

// Listen to console messages
page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
});

// Listen to page errors
page.on('pageerror', error => {
  console.log(`[PAGE ERROR] ${error.message}`);
});

// Listen to request failures
page.on('requestfailed', request => {
  console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
});

try {
  console.log('📍 Navigating to: https://3d60e690.aiagent-demo-cqf.pages.dev/\n');
  await page.goto('https://3d60e690.aiagent-demo-cqf.pages.dev/');
  
  // Wait for 15 seconds to capture all activity
  console.log('⏱️ Waiting 15 seconds to capture all console activity...\n');
  await page.waitForTimeout(15000);
  
  console.log('\n✅ Console capture complete');

} catch (error) {
  console.error('❌ Test failed:', error.message);
} finally {
  await browser.close();
}