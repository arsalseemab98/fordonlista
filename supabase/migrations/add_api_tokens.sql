-- Add API tokens table for external integrations like car.info
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL UNIQUE,
  refresh_token TEXT,
  bearer_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default car.info row
INSERT INTO api_tokens (service_name)
VALUES ('car_info')
ON CONFLICT (service_name) DO NOTHING;

-- Add RLS policies
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write tokens
CREATE POLICY "Allow all operations on api_tokens" ON api_tokens
  FOR ALL USING (true) WITH CHECK (true);
