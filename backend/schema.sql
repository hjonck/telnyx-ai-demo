-- Call sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  assistant_id TEXT NOT NULL,
  assistant_name TEXT,
  status TEXT NOT NULL DEFAULT 'initiating',
  telnyx_call_id TEXT,
  telnyx_call_control_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration INTEGER,
  recording TEXT,
  transcript TEXT,
  insights TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_call_sessions_user_id ON call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON call_sessions(created_at);

-- Webhook events log (optional, for debugging)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_session_id ON webhook_events(session_id);