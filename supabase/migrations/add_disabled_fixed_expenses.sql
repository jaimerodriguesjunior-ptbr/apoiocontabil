-- Add disabled_fixed_expenses column to company_settings
-- This stores an array of fixed expense names that are disabled for this company
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS disabled_fixed_expenses jsonb DEFAULT '[]'::jsonb;
