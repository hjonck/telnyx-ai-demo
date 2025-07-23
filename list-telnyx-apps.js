// List existing Telnyx Call Control Applications
async function listTelnyxApps() {
  console.log('📋 Listing Telnyx Call Control Applications');
  console.log('=========================================\n');
  
  const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
  
  if (!TELNYX_API_KEY) {
    console.log('❌ Please set TELNYX_API_KEY environment variable:');
    console.log('   export TELNYX_API_KEY="your-api-key-here"');
    console.log('   node list-telnyx-apps.js');
    console.log('\nYou can find your API key at:');
    console.log('https://portal.telnyx.com/#/app/api-keys');
    process.exit(1);
  }
  
  try {
    // List Call Control Applications
    const response = await fetch('https://api.telnyx.com/v2/call_control_applications?page[size]=100', {
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to list applications:', error);
      return;
    }
    
    const data = await response.json();
    console.log(`Found ${data.data.length} Call Control Applications:\n`);
    
    if (data.data.length === 0) {
      console.log('No Call Control Applications found.');
      console.log('\nTo create one, run:');
      console.log('node create-telnyx-app.js');
      return;
    }
    
    // Look for apps with our webhook URL
    const ourWebhookUrl = 'https://ai-agent-demo.agileworks.workers.dev/api/webhooks/telnyx';
    let foundOurApp = false;
    
    data.data.forEach((app, index) => {
      const isOurApp = app.webhook_event_url === ourWebhookUrl;
      if (isOurApp) foundOurApp = true;
      
      console.log(`${index + 1}. ${isOurApp ? '✅' : '📱'} ${app.application_name}`);
      console.log(`   ID: ${app.id}`);
      console.log(`   Webhook URL: ${app.webhook_event_url || 'Not set'}`);
      console.log(`   Active: ${app.active ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${new Date(app.created_at).toLocaleDateString()}`);
      
      if (isOurApp) {
        console.log('   👆 THIS IS YOUR APP FOR THE DEMO!');
      }
      console.log('');
    });
    
    if (foundOurApp) {
      console.log('✅ Found an application with the demo webhook URL!');
      console.log('\nTo use it, update the worker secret:');
      console.log('cd backend && npx wrangler secret put TELNYX_APP_CONNECTION_ID');
      console.log('Then paste the ID from above');
    } else {
      console.log('⚠️  No application found with the demo webhook URL.');
      console.log('\nYou can either:');
      console.log('1. Update an existing application in the Telnyx portal');
      console.log('2. Run: node create-telnyx-app.js');
    }
    
    // Also list phone numbers
    console.log('\n📞 Checking your phone numbers...\n');
    const phoneResponse = await fetch('https://api.telnyx.com/v2/phone_numbers?page[size]=100', {
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      if (phoneData.data.length > 0) {
        console.log(`Found ${phoneData.data.length} phone numbers:`);
        phoneData.data.forEach(phone => {
          console.log(`   ${phone.phone_number} - ${phone.status}`);
        });
        
        console.log('\nUpdate the "from" number in calls.ts to use one of these numbers.');
      } else {
        console.log('No phone numbers found. You need to purchase a number at:');
        console.log('https://portal.telnyx.com/#/app/numbers/search-numbers');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
listTelnyxApps().catch(console.error);