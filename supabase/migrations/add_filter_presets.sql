-- Create filter_presets table for saving filter configurations
CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  page VARCHAR(50) NOT NULL, -- 'playground', 'historik', 'leads', etc.
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster lookups by page
CREATE INDEX IF NOT EXISTS idx_filter_presets_page ON filter_presets(page);

-- Ensure only one default per page
CREATE UNIQUE INDEX IF NOT EXISTS idx_filter_presets_default ON filter_presets(page) WHERE is_default = true;
