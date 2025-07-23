import { Context } from 'hono';
import type { Env, WebhookEvent } from '../types';

export async function webhookHandler(c: Context<{ Bindings: Env }>) {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Method:', c.req.method);
  console.log('URL:', c.req.url);
  
  try {
    const body = await c.req.text();
    console.log('Body:', body);
    
    const signature = c.req.header('telnyx-signature-ed25519');
    const timestamp = c.req.header('telnyx-timestamp');
    
    // For webhook testing, allow missing headers but log warning
    if (!signature || !timestamp) {
      console.warn('⚠️ Missing webhook headers - signature verification skipped');
    }
    
    // Verify webhook signature
    let event: WebhookEvent;
    
    try {
      // For demo: skip signature verification
      // In production: properly verify the webhook
      event = JSON.parse(body) as WebhookEvent;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return c.json({ error: 'Invalid webhook' }, 400);
    }
    
    console.log('Event type:', event.data?.event_type);
    console.log('Event payload:', JSON.stringify(event.data?.payload));
    
    // Extract session ID and assistant ID from client state
    const clientState = event.data?.payload?.client_state;
    let sessionId: string | null = null;
    let assistantId: string | null = null;
    
    if (clientState) {
      try {
        const decoded = JSON.parse(atob(clientState));
        sessionId = decoded.sessionId;
        assistantId = decoded.assistantId;
        console.log('Decoded client state:', { sessionId, assistantId });
      } catch (err) {
        console.error('Failed to decode client state:', err);
      }
    }
    
    // Handle different event types
    const eventType = event.data?.event_type || event.event_type;
    console.log('Processing event type:', eventType);
    
    switch (eventType) {
      case 'call.initiated':
        console.log('Call initiated:', event.data.payload.call_session_id);
        break;
        
      case 'call.answered':
        console.log('Call answered:', event.data?.payload?.call_session_id);
        if (sessionId) {
          await updateCallStatus(c.env, sessionId, 'in_progress');
          
          // Note: AI assistant might already be started if using assistant_id in call initiation
          // Only start if not already active
          if (assistantId && event.data?.payload?.call_control_id) {
            console.log('Call answered - AI assistant should already be active');
            // await startAIAssistant(c.env, event.data.payload.call_control_id, assistantId);
          }
        }
        break;
        
      case 'call.hangup':
      case 'call.bridged':  // When call ends via bridge
      case 'call.machine.detection.ended': // When AMD completes
        console.log('Call ended/completed:', eventType, event.data?.payload?.call_session_id);
        if (sessionId) {
          await handleCallEnd(c.env, sessionId, event);
        }
        break;
        
      case 'call.recording.saved':
        console.log('Recording saved:', event.data.payload.recording_urls);
        if (sessionId && event.data.payload.recording_urls?.mp3) {
          await updateCallRecording(c.env, sessionId, event.data.payload.recording_urls.mp3);
        }
        break;
        
      case 'call.transcription.ready':
        console.log('Transcription ready:', event.data.payload.transcription);
        if (sessionId && event.data.payload.transcription?.text) {
          await updateCallTranscript(c.env, sessionId, event.data.payload.transcription.text);
        }
        break;
        
      case 'ai.summary':
      case 'ai.intent':
      case 'ai.transcript':
      case 'ai.ended':
        // AI conversation events
        console.log('AI event received:', eventType, event.data?.payload);
        if (sessionId) {
          if (eventType === 'ai.ended') {
            // AI conversation ended - call might still be active
            console.log('AI conversation ended');
            await updateCallStatus(c.env, sessionId, 'ai_completed');
          } else if (event.data?.payload?.summary) {
            await updateCallInsights(c.env, sessionId, event.data.payload.summary);
          } else if (event.data?.payload?.transcript) {
            await updateCallTranscript(c.env, sessionId, event.data.payload.transcript);
          }
        }
        break;
        
      default:
        console.log('Unhandled event type:', eventType);
        console.log('Full event:', JSON.stringify(event));
    }
    
    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
}

async function updateCallStatus(env: Env, sessionId: string, status: string) {
  await env.DB.prepare(
    `UPDATE call_sessions SET status = ?, updated_at = ? WHERE id = ?`
  )
    .bind(status, new Date().toISOString(), sessionId)
    .run();
}

async function handleCallEnd(env: Env, sessionId: string, event: WebhookEvent) {
  const endTime = event.data.payload.end_time || new Date().toISOString();
  const duration = event.data.payload.call_duration || 0;
  
  await env.DB.prepare(
    `UPDATE call_sessions 
     SET status = ?, ended_at = ?, duration = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind('completed', endTime, duration, new Date().toISOString(), sessionId)
    .run();
}

async function updateCallRecording(env: Env, sessionId: string, recordingUrl: string) {
  await env.DB.prepare(
    `UPDATE call_sessions SET recording = ?, updated_at = ? WHERE id = ?`
  )
    .bind(recordingUrl, new Date().toISOString(), sessionId)
    .run();
}

async function updateCallTranscript(env: Env, sessionId: string, transcript: string) {
  await env.DB.prepare(
    `UPDATE call_sessions SET transcript = ?, updated_at = ? WHERE id = ?`
  )
    .bind(transcript, new Date().toISOString(), sessionId)
    .run();
}

async function startAIAssistant(env: Env, callControlId: string, assistantId: string) {
  try {
    const response = await fetch(
      `https://api.telnyx.com/v2/calls/${callControlId}/actions/ai_assistant_start`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          assistant: {
            id: assistantId,
          },
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to start AI assistant:', error);
    } else {
      console.log('AI assistant started successfully');
    }
  } catch (error) {
    console.error('Error starting AI assistant:', error);
  }
}

async function updateCallInsights(env: Env, sessionId: string, insights: string) {
  await env.DB.prepare(
    `UPDATE call_sessions SET insights = ?, updated_at = ? WHERE id = ?`
  )
    .bind(insights, new Date().toISOString(), sessionId)
    .run();
}