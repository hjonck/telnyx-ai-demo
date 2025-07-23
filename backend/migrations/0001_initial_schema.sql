-- Create call_sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  assistant_id TEXT NOT NULL,
  assistant_name TEXT,
  telnyx_call_id TEXT,
  telnyx_call_control_id TEXT,
  status TEXT NOT NULL DEFAULT 'initiating',
  duration INTEGER DEFAULT 0,
  recording TEXT,
  transcript TEXT,
  insights TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_sessions_user_id ON call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON call_sessions(created_at);