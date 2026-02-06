-- Bilprospekt weekly sync log table
-- Tracks automated data refresh from Bilprospekt API

CREATE TABLE IF NOT EXISTS bilprospekt_sync_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed', 'skipped')),
  bilprospekt_date text, -- The data date from Bilprospekt (e.g. "2026-02-02")
  our_previous_date text, -- What we had stored before this sync
  records_fetched integer DEFAULT 0,
  records_upserted integer DEFAULT 0,
  records_removed integer DEFAULT 0,
  error_message text,
  trigger_type text DEFAULT 'cron' CHECK (trigger_type IN ('cron', 'manual')),
  created_at timestamptz DEFAULT now()
);

-- Index for quick lookups of latest sync
CREATE INDEX idx_bilprospekt_sync_log_started_at ON bilprospekt_sync_log (started_at DESC);
CREATE INDEX idx_bilprospekt_sync_log_status ON bilprospekt_sync_log (status);
