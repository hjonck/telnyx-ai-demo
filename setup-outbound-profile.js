// Set up Outbound Voice Profile for Telnyx Call Control
async function setupOutboundProfile() {
  console.log('🔧 Setting up Outbound Voice Profile');
  console.log('===================================\n');
  
  const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
  
  if (!TELNYX_API_KEY) {
    console.log('❌ Please set TELNYX_API_KEY environment variable');
    process.exit(1);
  }
  
  try {
    // First, list existing outbound voice profiles
    console.log('📋 Checking existing Outbound Voice Profiles...\n');
    const listResponse = await fetch('https://api.telnyx.com/v2/outbound_voice_profiles', {
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('❌ Failed to list profiles:', error);
      return;
    }
    
    const profiles = await listResponse.json();
    let profileId = null;
    
    if (profiles.data.length > 0) {
      console.log(`Found ${profiles.data.length} existing profiles:\n`);
      profiles.data.forEach(profile => {
        console.log(`📞 ${profile.name}`);
        console.log(`   ID: ${profile.id}`);
        console.log(`   Concurrent Call Limit: ${profile.concurrent_call_limit || 'Unlimited'}`);
        console.log(`   Enabled: ${profile.enabled ? '✅' : '❌'}`);
        console.log('');
      });
      
      // Use the first enabled profile
      const enabledProfile = profiles.data.find(p => p.enabled);
      if (enabledProfile) {
        profileId = enabledProfile.id;
        console.log(`✅ Using existing profile: ${enabledProfile.name}\n`);
      }
    }
    
    // If no profile exists, create one
    if (!profileId) {
      console.log('📞 Creating new Outbound Voice Profile...\n');
      const createResponse = await fetch('https://api.telnyx.com/v2/outbound_voice_profiles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: 'AI Agent Demo Profile',
          concurrent_call_limit: 10,
          enabled: true,
          traffic_type: 'conversational',
          whitelisted_destinations: ['ZA', 'US', 'GB'], // Add your countries
          billing_group_id: null
        })
      });
      
      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error('❌ Failed to create profile:', error);
        return;
      }
      
      const newProfile = await createResponse.json();
      profileId = newProfile.data.id;
      console.log('✅ Created new Outbound Voice Profile!');
      console.log(`   ID: ${profileId}\n`);
    }
    
    // Now update the Call Control Application with the profile
    console.log('🔗 Updating Call Control Application with Outbound Profile...\n');
    
    const appId = '2745448105422882184'; // Your Call Control App ID
    
    const updateResponse = await fetch(`https://api.telnyx.com/v2/call_control_applications/${appId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        outbound: {
          outbound_voice_profile_id: profileId,
          channel_limit: 10
        }
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to update application:', error);
      
      // Try to parse error
      try {
        const errorData = JSON.parse(error);
        if (errorData.errors) {
          console.log('\nError details:');
          errorData.errors.forEach(err => {
            console.log(`  - ${err.detail || err.title}`);
          });
        }
      } catch {}
      
      console.log('\n📌 Manual steps to fix this:');
      console.log('1. Go to https://portal.telnyx.com/#/app/call-control/applications');
      console.log('2. Click on "AI Agent Demo"');
      console.log('3. In the Outbound section, select an Outbound Voice Profile');
      console.log('4. Save the changes');
      
      return;
    }
    
    console.log('✅ Call Control Application updated successfully!');
    console.log('\n🎉 Your Telnyx setup is now complete!');
    console.log('\nThe demo should now be able to make calls.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
setupOutboundProfile().catch(console.error);