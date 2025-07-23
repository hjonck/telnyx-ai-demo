# Telnyx Integration Notes

## Important: API Endpoint Differences

### Current Issue
The AI assistant is not being attached to calls because we're using the wrong API approach.

### Two Different Telnyx APIs

1. **Call Control API** (`/v2/calls`)
   - What we're currently using
   - Does NOT support AI assistants directly
   - Used for basic call control operations
   - Cannot attach AI assistants via the `ai` parameter

2. **TeXML API** (`/v2/texml/calls`)
   - Required for AI assistant integration
   - Uses XML-based instructions
   - Supports `<AIAssistant>` TeXML element
   - Different response format and call flow

### Example of Working TeXML Call
```bash
curl --request POST \
  --url https://api.telnyx.com/v2/texml/calls \
  --header "Authorization: Bearer $TELNYX_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "connection_id": "2745448105422882184",
    "to": "+27824130484",
    "from": "+27600137472",
    "texml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><AIAssistant assistant_id=\"assistant-ef88eaec-b5d0-47f3-90e7-3fb2a0d894cf\" /></Response>"
  }'
```

### Current Implementation Status
- ✅ Call initiation works (calls are placed)
- ❌ AI assistant not attached (wrong API endpoint)
- ❌ Webhook callbacks not working properly with TeXML
- ✅ Database tracking and UI working

### Next Steps
1. Fully migrate to TeXML API for call initiation
2. Update webhook handling for TeXML events (different format)
3. Test AI assistant attachment with TeXML
4. Update response parsing for TeXML call responses

### Webhook Differences
- Call Control webhooks: Standard JSON events
- TeXML webhooks: May include TeXML instructions in responses
- Event types and payload structures differ between APIs

### Decision
For now, we'll continue using the Call Control API as a POC to demonstrate:
- Basic call functionality
- Database integration
- UI/UX flow
- Webhook infrastructure

The full AI assistant integration will require switching to TeXML API in a future iteration.