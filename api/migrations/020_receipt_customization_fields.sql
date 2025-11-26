-- Migration 020: Add receipt customization fields
-- Adds fields to support honorific selection, custom proviso, and reissue tracking

ALTER TABLE receipts
ADD COLUMN honorific TEXT DEFAULT '様',
ADD COLUMN custom_proviso TEXT NULL,
ADD COLUMN is_reissue BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN receipts.honorific IS 'Honorific suffix used on the receipt (様, 御中, 殿, 先生)';
COMMENT ON COLUMN receipts.custom_proviso IS 'Custom proviso text (但し書き) if provided, otherwise uses facility name';
COMMENT ON COLUMN receipts.is_reissue IS 'Indicates if this receipt is a reissue/reprint of an existing receipt';
