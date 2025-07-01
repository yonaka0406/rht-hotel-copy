CREATE TABLE invoices (
   id UUID,
   hotel_id INT NOT NULL REFERENCES hotels(id),
   date DATE NOT NULL,
   client_id UUID NOT NULL REFERENCES clients(id),
   invoice_number TEXT,
   status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')) NOT NULL DEFAULT 'draft',
   display_name TEXT NULL,
   due_date DATE NULL,
   total_stays INT NULL,
   comment TEXT NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   UNIQUE (id, hotel_id, date, client_id, invoice_number)
) PARTITION BY LIST (hotel_id);

CREATE TABLE receipts (
   id UUID DEFAULT gen_random_uuid(),
   hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
   receipt_number TEXT NOT NULL,
   receipt_date DATE NOT NULL,
   amount DECIMAL,
   tax_breakdown JSONB NULL,
   created_by INT REFERENCES users(id),
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (hotel_id, id),
   UNIQUE (hotel_id, receipt_number) -- Ensures receipt number is unique within a hotel
) PARTITION BY LIST (hotel_id);

COMMENT ON TABLE receipts IS 'Stores generated receipt information, linked to payments.';
COMMENT ON COLUMN receipts.receipt_number IS 'The unique sequential number generated for the receipt, specific to the hotel.';

-- Add the foreign key constraint from reservation_payments to receipts
-- This was deferred from 005_reservations.sql
ALTER TABLE reservation_payments
ADD CONSTRAINT fk_reservation_payments_receipts
FOREIGN KEY (receipt_id, hotel_id) REFERENCES receipts(id, hotel_id) ON DELETE SET NULL;

-- Add the foreign key constraint from reservation_payments to invoices (if invoice_id is a FK)
-- The original schema for reservation_payments has `invoice_id UUID DEFAULT NULL,`
-- but no explicit foreign key constraint to the `invoices` table.
-- If it's intended to be a foreign key, it should be added here.
-- For now, I'm assuming it's not a strict FK based on the original DDL.
-- If it should be, the following could be added:
-- ALTER TABLE reservation_payments
-- ADD CONSTRAINT fk_reservation_payments_invoices
-- FOREIGN KEY (invoice_id, hotel_id) REFERENCES invoices(id, hotel_id) ON DELETE SET NULL;
-- However, `invoices` table PK is `UNIQUE (id, hotel_id, date, client_id, invoice_number)`
-- and `invoices` is partitioned by `hotel_id`. A simple FK on `(invoice_id, hotel_id)` might not be directly
-- possible if `invoice_id` is not unique across hotels or if `invoices.id` is not globally unique.
-- The current PK of invoices is (id, hotel_id, date, client_id, invoice_number).
-- A FK from reservation_payments would need to reference a UNIQUE key in invoices.
-- Let's assume `invoices.id` is the intended UUID for the invoice and is globally unique or unique per hotel.
-- If `invoices.id` is the PK component to reference:
-- ALTER TABLE reservation_payments
-- ADD CONSTRAINT fk_reservation_payments_invoice_id
-- FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
-- This needs clarification on how `invoice_id` in `reservation_payments` relates to `invoices` table.
-- Given the partitioning and composite key of invoices, a simple FK is tricky.
-- The `UNIQUE (id, hotel_id, date, client_id, invoice_number)` on `invoices` means `id` alone is not guaranteed unique.
-- The original DDL did not have this FK, so I will maintain that for now.
