import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { authMiddleware } from './middleware/auth';
import { webhookHandler } from './routes/webhooks';
import { callsRouter } from './routes/calls';
import { assistantsRouter } from './routes/assistants';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/api/*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public webhook endpoint (no auth)
app.post('/api/webhooks/telnyx', webhookHandler);

// Protected API routes
app.use('/api/*', authMiddleware);

// Mount routers
app.route('/api/calls', callsRouter);
app.route('/api/assistants', assistantsRouter);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json(
    { error: 'Internal server error', message: err.message },
    500
  );
});

export default app;