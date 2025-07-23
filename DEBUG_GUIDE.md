# AI Agent Demo - Frontend Debugging Guide

## Issue
The frontend at https://aiagent-demo-cqf.pages.dev/ is stuck spinning and not displaying AI assistants, even though the API is working correctly.

## What We Know
1. ✅ The API at https://ai-agent-demo.agileworks.workers.dev/api/assistants works perfectly
2. ✅ The API returns 3 assistants when called with the correct auth token
3. ✅ CORS headers are properly configured
4. ✅ The frontend builds without errors
5. ❌ The frontend UI spins indefinitely and doesn't display assistants

## Debugging Steps

### 1. Browser Console Check
Open https://aiagent-demo-cqf.pages.dev/ and immediately open the browser's Developer Console (F12):
- Look for any JavaScript errors
- Check if you see the console.log messages we added:
  - "Component mounted, loading assistants..."
  - "Fetching assistants from: https://ai-agent-demo.agileworks.workers.dev/api/assistants"
  - "Response received: ..."

### 2. Test with Local HTML File
```bash
# Run the test server
cd /Users/hjonck/Development/gitprojects/AgileWorksZA/messagehub/telnyx-ai-demo
python3 serve-test.py

# Open in browser
open http://localhost:8000/test-frontend-api.html
```

Click through each test button in order:
1. Environment Check - Verifies browser can reach the API
2. Basic Fetch Test - Tests unauthenticated request (should get 401)
3. Authenticated Fetch Test - Tests with auth token (should get assistants)
4. Simulate SvelteKit - Mimics exact frontend behavior
5. Test CORS - Checks CORS preflight
6. Full Frontend Simulation - Complete end-to-end test

### 3. Direct API Test
```bash
# Test the API directly
node test-api-call.js

# Or use curl
curl -H "Authorization: Bearer demo-secret-token" \
     https://ai-agent-demo.agileworks.workers.dev/api/assistants
```

### 4. Browser Extension Debug (Chrome/Edge)
1. Open chrome://extensions/ or edge://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `debug-extension` folder
5. Visit https://aiagent-demo-cqf.pages.dev/
6. Open console to see detailed fetch logging

### 5. Network Tab Analysis
1. Open DevTools Network tab before loading the page
2. Look for the `/api/assistants` request
3. Check:
   - Is the request being made?
   - What's the response status?
   - Are there any failed requests?
   - Is there a CORS preflight (OPTIONS) request?

### 6. Check for Common Issues

#### A. Mixed Content
- Ensure the page isn't trying to load HTTP resources over HTTPS

#### B. Content Security Policy
- Check response headers for restrictive CSP

#### C. JavaScript Bundle Issues
- Look for chunk loading failures
- Check if all JS files load successfully

#### D. SvelteKit Hydration
- Look for hydration errors in console
- Check if the page source contains the expected HTML

### 7. Local Development Test
```bash
# Test with local frontend
cd frontend
npm run dev

# This should work since it's configured for localhost:8787
```

### 8. Test Simple HTML on Pages
Create a minimal test by deploying test-api.html to Pages to isolate the issue:
```bash
cd /Users/hjonck/Development/gitprojects/AgileWorksZA/messagehub/telnyx-ai-demo
cp test-api.html frontend/static/test.html
cd frontend
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=aiagent-demo
```

Then visit: https://aiagent-demo-cqf.pages.dev/test.html

## Potential Fixes

### If console shows no logs:
- JavaScript isn't executing - check for syntax errors
- onMount isn't firing - SvelteKit hydration issue

### If fetch is failing:
- Check exact error message
- Verify auth token is correct
- Check if browser is blocking the request

### If response is empty:
- API might be returning different data in production
- Check response headers for clues

### If CORS is the issue:
- The preflight might be failing
- Browser might be caching failed CORS responses

## Quick Fix Attempts

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear all site data in DevTools > Application > Storage

2. **Try Different Browser**
   - Test in Chrome, Firefox, Safari, Edge
   - Try incognito/private mode

3. **Check from Different Network**
   - Sometimes corporate proxies interfere
   - Try mobile hotspot

4. **Verify Latest Deployment**
   ```bash
   cd frontend
   npm run build
   npx wrangler pages deploy .svelte-kit/cloudflare --project-name=aiagent-demo
   ```

## API Working Confirmation
The API is confirmed working:
```json
{
  "assistants": [
    {
      "id": "53e055ee-45fa-491f-b599-ae29ba90fac3",
      "org_id": "6de109be-f7aa-405f-bacd-1caf6a62e7f5",
      "name": "Customer Support Agent",
      "model": "gpt-3.5-turbo",
      "voice": "Olivia"
    },
    {
      "id": "57709074-17d6-414a-b0aa-e21cf5b3b0bb",
      "org_id": "6de109be-f7aa-405f-bacd-1caf6a62e7f5",
      "name": "CRM Assistant - Book a meeting",
      "model": "gpt-4",
      "voice": "Mark"
    },
    {
      "id": "66c2bb7a-0d46-412f-a207-80ed47e0b7e2",
      "org_id": "6de109be-f7aa-405f-bacd-1caf6a62e7f5",
      "name": "Information about MessageHub",
      "model": "gpt-4o",
      "voice": "Olivia"
    }
  ]
}
```

So the issue is specifically with the frontend, not the backend API.