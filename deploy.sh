#!/bin/bash

# Deploy script for Telnyx AI Demo

echo "🚀 Deploying Telnyx AI Demo to Cloudflare..."

# Check if logged in to Wrangler
echo "Checking Cloudflare authentication..."
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to Cloudflare. Running 'wrangler login'..."
    npx wrangler login
fi

# Backend deployment
echo "\n📦 Deploying backend..."
cd backend

# Create D1 database if it doesn't exist
echo "Setting up D1 database..."
if ! npx wrangler d1 list | grep -q "telnyx-ai-calls"; then
    echo "Creating D1 database..."
    npx wrangler d1 create telnyx-ai-calls
    echo "Please update wrangler.toml with the database ID shown above!"
    read -p "Press enter once you've updated the database ID..."
fi

# Run migrations
echo "Running database migrations..."
npx wrangler d1 execute telnyx-ai-calls --file=./schema.sql

# Create KV namespace if it doesn't exist
echo "Setting up KV namespace..."
if ! npx wrangler kv:namespace list | grep -q "SESSIONS"; then
    echo "Creating KV namespace..."
    npx wrangler kv:namespace create SESSIONS
    echo "Please update wrangler.toml with the KV namespace ID shown above!"
    read -p "Press enter once you've updated the KV namespace ID..."
fi

# Set secrets
echo "Setting up secrets..."
echo "Enter your Telnyx API Key:"
read -s TELNYX_API_KEY
npx wrangler secret put TELNYX_API_KEY <<< "$TELNYX_API_KEY"

echo "Enter your Telnyx Public Key:"
read -s TELNYX_PUBLIC_KEY
npx wrangler secret put TELNYX_PUBLIC_KEY <<< "$TELNYX_PUBLIC_KEY"

echo "Enter your Telnyx App Connection ID:"
read -s TELNYX_APP_CONNECTION_ID
npx wrangler secret put TELNYX_APP_CONNECTION_ID <<< "$TELNYX_APP_CONNECTION_ID"

echo "Enter a demo auth secret (any random string):"
read -s AUTH_SECRET
npx wrangler secret put AUTH_SECRET <<< "$AUTH_SECRET"

# Deploy backend
echo "Deploying backend to Cloudflare Workers..."
npm install
npx wrangler deploy

# Get the Worker URL
WORKER_URL=$(npx wrangler deploy --dry-run | grep -o 'https://[^[:space:]]*workers.dev')
echo "Backend deployed to: $WORKER_URL"

# Frontend deployment
echo "\n📦 Deploying frontend..."
cd ../frontend

# Update environment variable with backend URL
echo "VITE_API_URL=$WORKER_URL" > .env.production

# Install and build
npm install
npm run build

# Deploy to Pages
echo "Deploying frontend to Cloudflare Pages..."
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=telnyx-ai-demo

echo "\n✅ Deployment complete!"
echo "Backend: $WORKER_URL"
echo "Frontend: https://telnyx-ai-demo.pages.dev"
echo "\nMake sure to:"
echo "1. Update the AUTH_TOKEN in frontend to match your AUTH_SECRET"
echo "2. Configure your Telnyx webhook URL to: $WORKER_URL/api/webhooks/telnyx"
echo "3. Set up a Telnyx phone number and connection"