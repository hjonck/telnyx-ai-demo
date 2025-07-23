# Telnyx AI Voice Demo Setup Guide

## Prerequisites

1. **Telnyx Account**
   - Sign up at https://telnyx.com
   - Get your API Key from Mission Control Portal
   - Create AI Assistants at https://portal.telnyx.com/#/ai/assistants
   - Create a Voice Application
   - Purchase a phone number
   - Set up a Connection

2. **Cloudflare Account**
   - Sign up at https://cloudflare.com
   - Install Wrangler CLI: `npm install -g wrangler`

## Quick Start

1. **Clone and install dependencies:**
```bash
# Backend
cd backend && npm install

# Frontend  
cd ../frontend && npm install
```

2. **Configure Telnyx:**
   - Go to Telnyx Mission Control Portal
   - Create AI Assistants with your desired personalities and instructions
   - Create a new Voice Application
   - Set the webhook URL to: `https://your-worker.workers.dev/api/webhooks/telnyx`
   - Note your Connection ID

3. **Local Development:**
```bash
# Terminal 1: Backend
cd backend
npx wrangler dev --local --persist

# Terminal 2: Frontend
cd frontend
npm run dev
```

4. **Deploy to Cloudflare:**
```bash
./deploy.sh
```

## Authentication Options

### Option 1: Simple Token (Current - Demo)
- Uses a shared secret token
- Good for POC and demos
- Set `AUTH_SECRET` in Worker secrets

### Option 2: Cloudflare Zero Trust (Recommended)
- Set up Access policies
- Integrate with your identity provider
- More secure for production

### Option 3: JWT with Supabase/Auth0
- Full authentication system
- User management
- Session handling

## Telnyx Configuration

1. **Create AI Assistants:**
   - Go to https://portal.telnyx.com/#/ai/assistants
   - Click "Create Assistant"
   - Configure name, model, voice, and instructions
   - Save and note the Assistant ID

2. **Create Voice Application:**
   - Name: "AI Voice Demo"
   - Type: Voice
   - Webhook URL: Your Worker URL + `/api/webhooks/telnyx`
   - Webhook Version: HTTP JSON v2

2. **Configure Phone Number:**
   - Purchase a number in your region
   - Assign to your TeXML application
   - Enable voice capabilities

3. **Connection Settings:**
   - Create an Outbound Voice Profile
   - Note the Connection ID
   - Configure codecs (G711U recommended)

## Testing

1. **Test locally:**
   - Use ngrok to expose local webhook: `ngrok http 8787`
   - Update Telnyx webhook to ngrok URL
   - Make test calls

2. **Monitor calls:**
   - Check Telnyx Debug logs
   - View Worker logs: `npx wrangler tail`
   - Check browser console

## Production Considerations

1. **Security:**
   - Implement proper authentication
   - Verify webhook signatures
   - Use environment-specific secrets

2. **Scaling:**
   - Workers scale automatically
   - Consider D1 row limits
   - Implement cleanup for old calls

3. **Cost Management:**
   - Monitor Telnyx usage
   - Set spending limits
   - Track call durations

## Troubleshooting

**Call fails to connect:**
- Check Telnyx connection status
- Verify phone number format
- Check Worker logs for errors

**No audio/transcript:**
- Ensure recording is enabled
- Check Telnyx transcription settings
- Verify webhook is receiving events

**Authentication errors:**
- Verify AUTH_SECRET matches
- Check CORS settings
- Ensure tokens are valid

## Next Steps

1. **Enhance AI Integration:**
   - Connect to OpenAI/Anthropic for smarter responses
   - Add context awareness
   - Implement conversation memory

2. **Add Features:**
   - Real-time WebSocket updates
   - Call scheduling
   - Multiple AI personalities
   - Call analytics dashboard

3. **Production Setup:**
   - Custom domain
   - Monitoring and alerts
   - Backup and recovery
   - Rate limiting