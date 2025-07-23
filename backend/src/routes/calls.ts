import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, CallSession } from '../types';

const callsRouter = new Hono<{ Bindings: Env }>();

// Debug endpoint to check configuration
callsRouter.get('/debug', async (c) => {
  return c.json({
    environment: c.env.ENVIRONMENT,
    hasApiKey: !!c.env.TELNYX_API_KEY,
    apiKeyLength: c.env.TELNYX_API_KEY?.length || 0,
    hasConnectionId: !!c.env.TELNYX_APP_CONNECTION_ID,
    connectionId: c.env.TELNYX_APP_CONNECTION_ID || 'NOT_SET',
    webhookPath: c.env.TELNYX_WEBHOOK_PATH,
    frontendUrl: c.env.FRONTEND_URL,
  });
});

// Schema for initiating a call
const initiateCallSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  assistantId: z.string().min(1),  // Telnyx assistant IDs are not UUIDs
  assistantName: z.string().optional(),
});

// Initialize a new AI call
callsRouter.post('/initiate', async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received call initiation request:', body);
    
    const validated = initiateCallSchema.parse(body);
    
    // Create call session in D1
    const sessionId = crypto.randomUUID();
    const session: CallSession = {
      id: sessionId,
      userId: c.get('userId') || 'demo-user',
      phoneNumber: validated.phoneNumber,
      assistantId: validated.assistantId,
      assistantName: validated.assistantName,
      status: 'initiating',
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('Creating session:', session);
    
    // Store session in D1
    try {
      await c.env.DB.prepare(
        `INSERT INTO call_sessions (id, user_id, phone_number, assistant_id, assistant_name, status, started_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          session.id,
          session.userId,
          session.phoneNumber,
          session.assistantId,
          session.assistantName || null,
          session.status,
          session.startedAt,
          session.createdAt,
          session.updatedAt
        )
        .run();
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to create call session in database');
    }
    
    // Initiate the call using Telnyx API
    const webhookUrl = `${c.req.url.origin}${c.env.TELNYX_WEBHOOK_PATH}`;
    const callPayload = {
      connection_id: c.env.TELNYX_APP_CONNECTION_ID,
      to: validated.phoneNumber,
      from: '+27600137472', // Your Telnyx number
      webhook_url: webhookUrl,
      webhook_url_method: 'POST',
      record: 'record-from-answer',
      answering_machine_detection: 'detect',
      client_state: btoa(JSON.stringify({ sessionId, assistantId: validated.assistantId })),
      // Add AI assistant configuration
      ai: {
        assistant_id: validated.assistantId,
      }
    };
    
    console.log('Initiating Telnyx call with payload:', callPayload);
    console.log('Using API key:', c.env.TELNYX_API_KEY ? 'Present' : 'Missing');
    console.log('Using connection ID:', c.env.TELNYX_APP_CONNECTION_ID || 'Missing');
    
    const response = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(callPayload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to initiate call:', errorText);
      
      // Parse Telnyx error for better debugging
      let telnyxError;
      try {
        telnyxError = JSON.parse(errorText);
      } catch {
        telnyxError = { message: errorText };
      }
      
      throw new Error(`Telnyx API error (${response.status}): ${telnyxError.errors?.[0]?.detail || telnyxError.message || errorText}`);
    }
    
    const callResponse = await response.json();
    console.log('Telnyx call response:', JSON.stringify(callResponse));
    
    // Handle both response formats (data wrapper and direct response)
    const call = callResponse.data || callResponse;
    
    // Update session with Telnyx call info
    await c.env.DB.prepare(
      `UPDATE call_sessions 
       SET telnyx_call_id = ?, telnyx_call_control_id = ?, status = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        call.id || call.call_session_id,
        call.call_control_id,
        'in_progress',
        new Date().toISOString(),
        sessionId
      )
      .run();
    
    return c.json({
      success: true,
      sessionId,
      callId: call.id || call.call_session_id,
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    
    // Return more detailed error in development
    if (c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'production') {
      return c.json({ 
        error: error instanceof Error ? error.message : 'Failed to initiate call',
        details: error instanceof Error ? error.stack : undefined
      }, 500);
    }
    
    return c.json({ error: 'Failed to initiate call' }, 500);
  }
});

// Get call session details
callsRouter.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  
  const result = await c.env.DB.prepare(
    `SELECT * FROM call_sessions WHERE id = ? AND user_id = ?`
  )
    .bind(sessionId, c.get('userId') || 'demo-user')
    .first();
  
  if (!result) {
    return c.json({ error: 'Call session not found' }, 404);
  }
  
  return c.json(result);
});

// List user's calls
callsRouter.get('/', async (c) => {
  const userId = c.get('userId') || 'demo-user';
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const results = await c.env.DB.prepare(
    `SELECT * FROM call_sessions 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  )
    .bind(userId, limit, offset)
    .all();
  
  const total = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM call_sessions WHERE user_id = ?`
  )
    .bind(userId)
    .first();
  
  return c.json({
    calls: results.results,
    total: total?.count || 0,
    limit,
    offset,
  });
});


export { callsRouter };