-- Add sent_to_call_at and sent_to_brev_at columns to bilprospekt_prospects
-- These track when a prospect was sent to the call list or letter list

ALTER TABLE bilprospekt_prospects
ADD COLUMN IF NOT EXISTS sent_to_call_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE bilprospekt_prospects
ADD COLUMN IF NOT EXISTS sent_to_brev_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_bilprospekt_prospects_sent_to_call
ON bilprospekt_prospects(sent_to_call_at) WHERE sent_to_call_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bilprospekt_prospects_sent_to_brev
ON bilprospekt_prospects(sent_to_brev_at) WHERE sent_to_brev_at IS NOT NULL;
