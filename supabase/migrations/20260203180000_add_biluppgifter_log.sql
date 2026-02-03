-- Biluppgifter log table
CREATE TABLE IF NOT EXISTS biluppgifter_log (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('info', 'error', 'warning')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent logs
CREATE INDEX idx_biluppgifter_log_created_at ON biluppgifter_log(created_at DESC);
CREATE INDEX idx_biluppgifter_log_type ON biluppgifter_log(type);

-- Comment
COMMENT ON TABLE biluppgifter_log IS 'Logs for biluppgifter cron job - errors and status';
