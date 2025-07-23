import { Hono } from 'hono';
import type { Env, AIAssistant } from '../types';

const assistantsRouter = new Hono<{ Bindings: Env }>();

// List all AI assistants
assistantsRouter.get('/', async (c) => {
  try {
    // Fetch AI assistants from Telnyx
    const response = await fetch('https://api.telnyx.com/v2/ai/assistants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${c.env.TELNYX_API_KEY}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to fetch assistants:', error);
      throw new Error('Failed to fetch AI assistants');
    }
    
    const data = await response.json();
    
    // Transform the response to our format
    const assistants: AIAssistant[] = data.data.map((assistant: any) => ({
      id: assistant.id,
      name: assistant.name,
      description: assistant.description || '',
      model: assistant.model,
      instructions: assistant.instructions,
      voice: assistant.voice?.voice || 'default',
      created_at: assistant.created_at,
      updated_at: assistant.updated_at,
    }));
    
    return c.json({
      assistants,
      total: assistants.length,
    });
  } catch (error) {
    console.error('Error listing assistants:', error);
    return c.json({ error: 'Failed to list AI assistants' }, 500);
  }
});

// Get a specific AI assistant
assistantsRouter.get('/:id', async (c) => {
  try {
    const assistantId = c.req.param('id');
    const response = await fetch(`https://api.telnyx.com/v2/ai/assistants/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${c.env.TELNYX_API_KEY}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return c.json({ error: 'Assistant not found' }, 404);
      }
      throw new Error('Failed to fetch assistant');
    }
    
    const data = await response.json();
    const assistant = data.data;
    
    return c.json({
      id: assistant.id,
      name: assistant.name,
      description: assistant.description || '',
      model: assistant.model,
      instructions: assistant.instructions,
      voice: assistant.voice?.voice || 'default',
      created_at: assistant.created_at,
      updated_at: assistant.updated_at,
    });
  } catch (error) {
    console.error('Error fetching assistant:', error);
    return c.json({ error: 'Failed to fetch AI assistant' }, 500);
  }
});

export { assistantsRouter };