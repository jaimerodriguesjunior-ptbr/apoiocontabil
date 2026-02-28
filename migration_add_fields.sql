-- Add missing fields for NFS-e emission
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS aliquota_iss numeric(5,2) DEFAULT 0;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS codigo_servico text DEFAULT '2.01';
