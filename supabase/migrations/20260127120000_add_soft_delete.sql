-- Add soft delete support to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for quickly finding non-deleted leads (used by all normal queries)
CREATE INDEX IF NOT EXISTS idx_leads_not_deleted ON leads (deleted_at) WHERE deleted_at IS NULL;

-- Index for quickly finding deleted leads (used by trash page)
CREATE INDEX IF NOT EXISTS idx_leads_deleted ON leads (deleted_at) WHERE deleted_at IS NOT NULL;
