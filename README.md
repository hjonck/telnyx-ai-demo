# Telnyx AI Voice Demo on Cloudflare

A proof of concept for integrating Telnyx AI assistants with Cloudflare Workers, featuring:
- Use your existing Telnyx AI assistants
- Outbound AI-powered voice calls (Note: AI assistant integration requires TeXML API - see TELNYX_INTEGRATION_NOTES.md)
- Real-time transcription and insights
- Call recording and chat retrieval
- Simple web interface

## Architecture

1. **Frontend**: SvelteKit on Cloudflare Pages
2. **Backend**: Cloudflare Workers with Hono
3. **Auth**: Cloudflare Zero Trust (for demo) or simple API keys
4. **Voice**: Telnyx Voice API with TeXML for AI interactions
5. **Storage**: D1 for call logs and transcripts

## Features

- List and select from your existing Telnyx AI assistants
- Initiate AI-powered calls to any number
- Real-time call status updates
- Retrieve call transcripts, recordings, and AI insights
- Simple authentication for demo purposes

## Setup

1. Clone this repository
2. Install dependencies: `npm install`
3. Set up Telnyx account and get API credentials
4. Configure environment variables
5. Deploy to Cloudflare

## Environment Variables

```
TELNYX_API_KEY=your_api_key
TELNYX_PUBLIC_KEY=your_public_key  # Optional - not currently used
TELNYX_APP_CONNECTION_ID=your_connection_id
AUTH_SECRET=demo-secret-token  # For demo purposes
```

## Quick Setup Guide

### 1. Set up Telnyx Call Control Application

First, export your Telnyx API key (find it at https://portal.telnyx.com/#/app/api-keys):
```bash
export TELNYX_API_KEY="your-api-key-here"
```

Then list your existing Call Control Applications:
```bash
node list-telnyx-apps.js
```

If you don't have one with the correct webhook URL, create one:
```bash
node create-telnyx-app.js
```

### 2. Update Worker Secrets

Once you have the Call Control Application ID:
```bash
cd backend
npx wrangler secret put TELNYX_API_KEY
# Paste your Telnyx API key

npx wrangler secret put TELNYX_APP_CONNECTION_ID  
# Paste the Call Control Application ID

npx wrangler secret put AUTH_SECRET
# Enter: demo-secret-token
```

### 3. Update Phone Number

Edit `backend/src/routes/calls.ts` and change the `from` number to one of your Telnyx numbers:
```typescript
from: '+1234567890', // Your Telnyx number
```

### 4. Deploy

```bash
cd backend && npx wrangler deploy --env=""
cd ../frontend && npm run build && npm run deploy
```

The demo will be available at: https://aiagent-demo-cqf.pages.dev