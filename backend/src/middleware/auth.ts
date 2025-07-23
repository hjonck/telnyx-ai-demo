import { Context, Next } from 'hono';
import type { Env } from '../types';

// Simple auth middleware for demo
// In production, use Cloudflare Zero Trust or proper JWT
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  
  // For demo: simple token validation
  // In production: validate JWT or check with auth provider
  if (token !== c.env.AUTH_SECRET) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  // For demo: set a simple user context
  c.set('userId', 'demo-user');
  
  await next();
}