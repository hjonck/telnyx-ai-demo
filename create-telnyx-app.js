// Create a Telnyx Call Control Application via API
async function createTelnyxCallControlApp() {
  console.log('🔧 Creating Telnyx Call Control Application');
  console.log('=====================================\n');
  
  // Get the API key from the worker config
  const debugResponse = await fetch('https://ai-agent-demo.agileworks.workers.dev/api/calls/debug', {
    headers: {
      'Authorization': 'Bearer demo-secret-token'
    }
  });
  const debugData = await debugResponse.json();
  console.log('✅ Current connection ID:', debugData.connectionId);
  
  // First, let's get the API key from a test endpoint
  console.log('\n📌 Creating new Call Control Application...\n');
  console.log('⚠️  You need to provide your Telnyx API key to create the application.');
  console.log('You can find it at: https://portal.telnyx.com/#/app/api-keys\n');
  
  // Since we can't get the API key from the worker (it's a secret), 
  // let's create a script that uses it from environment or asks for it
  const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
  
  if (!TELNYX_API_KEY) {
    console.log('❌ Please set TELNYX_API_KEY environment variable:');
    console.log('   export TELNYX_API_KEY="your-api-key-here"');
    console.log('   node create-telnyx-app.js');
    process.exit(1);
  }
  
  try {
    // Create the Call Control Application
    const response = await fetch('https://api.telnyx.com/v2/call_control_applications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        application_name: 'AI Agent Demo',
        webhook_event_url: 'https://ai-agent-demo.agileworks.workers.dev/api/webhooks/telnyx',
        webhook_event_failover_url: '',
        webhook_api_version: '2',
        first_command_timeout: true,
        first_command_timeout_secs: 30,
        active: true,
        anchorsite_override: 'Latency',
        dtmf_type: 'RFC 2833',
        inbound: {
          channel_limit: 10,
          sip_subdomain_receive_settings: 'only_my_connections'
        },
        outbound: {
          channel_limit: 10,
          outbound_voice_profile_id: null
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to create application:', error);
      
      // If it fails, let's try to list existing applications
      console.log('\n📋 Checking existing Call Control Applications...\n');
      const listResponse = await fetch('https://api.telnyx.com/v2/call_control_applications', {
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      if (listResponse.ok) {
        const data = await listResponse.json();
        console.log(`Found ${data.data.length} existing applications:\n`);
        
        data.data.forEach(app => {
          console.log(`📱 ${app.application_name}`);
          console.log(`   ID: ${app.id}`);
          console.log(`   Webhook: ${app.webhook_event_url}`);
          console.log(`   Active: ${app.active}`);
          console.log('');
        });
        
        // Check if our webhook URL already exists
        const existingApp = data.data.find(app => 
          app.webhook_event_url === 'https://ai-agent-demo.agileworks.workers.dev/api/webhooks/telnyx'
        );
        
        if (existingApp) {
          console.log('✅ Found existing application with our webhook URL!');
          console.log(`\n🔑 Use this Connection ID: ${existingApp.id}\n`);
          console.log('To update the worker secret, run:');
          console.log(`cd backend && npx wrangler secret put TELNYX_APP_CONNECTION_ID`);
          console.log(`Then paste: ${existingApp.id}`);
          return;
        }
      }
      
      return;
    }
    
    const data = await response.json();
    console.log('✅ Call Control Application created successfully!\n');
    console.log('📱 Application Details:');
    console.log(`   Name: ${data.data.application_name}`);
    console.log(`   ID: ${data.data.id}`);
    console.log(`   Webhook URL: ${data.data.webhook_event_url}`);
    console.log(`   Active: ${data.data.active}`);
    
    console.log('\n🔑 Next Steps:');
    console.log('1. Update the worker secret with the new Connection ID:');
    console.log(`   cd backend && npx wrangler secret put TELNYX_APP_CONNECTION_ID`);
    console.log(`   Then paste: ${data.data.id}`);
    
    console.log('\n2. Make sure you have a phone number in your Telnyx account');
    console.log('   or update the "from" number in the code');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
createTelnyxCallControlApp().catch(console.error);