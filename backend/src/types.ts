export interface Env {
  // D1 Database
  DB: D1Database;
  
  // KV Namespace
  SESSIONS: KVNamespace;
  
  // Secrets
  TELNYX_API_KEY: string;
  TELNYX_PUBLIC_KEY: string;
  TELNYX_APP_CONNECTION_ID: string;
  AUTH_SECRET: string;
  
  // Environment
  ENVIRONMENT: 'development' | 'production';
  TELNYX_WEBHOOK_PATH: string;
  FRONTEND_URL: string;
}

export interface CallSession {
  id: string;
  userId: string;
  phoneNumber: string;
  assistantId: string;
  assistantName?: string;
  status: 'initiating' | 'in_progress' | 'completed' | 'failed';
  telnyxCallId?: string;
  telnyxCallControlId?: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  recording?: string;
  transcript?: string;
  insights?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIAssistant {
  id: string;
  name: string;
  description?: string;
  model: string;
  instructions: string;
  voice?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  data: {
    event_type: string;
    id: string;
    occurred_at: string;
    payload: {
      call_control_id?: string;
      call_leg_id?: string;
      call_session_id?: string;
      connection_id?: string;
      from?: string;
      to?: string;
      state?: string;
      start_time?: string;
      end_time?: string;
      call_duration?: number;
      recording_urls?: {
        mp3?: string;
        wav?: string;
      };
      transcription?: {
        text?: string;
        confidence?: number;
      };
    };
  };
}