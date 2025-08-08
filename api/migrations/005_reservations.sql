CREATE TABLE payment_types (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id) DEFAULT NULL, -- Reservation's hotel
    name TEXT NOT NULL,
    description TEXT,
    transaction TEXT CHECK (transaction IN ('cash', 'wire', 'credit', 'bill', 'point', 'discount')) NOT NULL DEFAULT 'cash',
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name)
);
INSERT INTO payment_types (name, transaction, created_by)
VALUES
    ('現金', 'cash', 1),
    ('ネットポイント', 'point', 1),
    ('事前振り込み', 'wire', 1),
    ('クレジットカード', 'credit', 1),
    ('請求書', 'bill', 1),
    ('割引', 'discount', 1);

CREATE TABLE reservations (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- Reservation's hotel
    reservation_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE, -- Reference to the client representing the company
    check_in DATE NOT NULL,
    check_in_time TIME DEFAULT '16:00',
    check_out DATE NOT NULL,
    check_out_time TIME DEFAULT '10:00',
    number_of_people INT NOT NULL,
    status TEXT CHECK (status IN ('hold', 'provisory', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'block')) NOT NULL DEFAULT 'hold',
    type TEXT CHECK (type IN ('default', 'employee', 'ota', 'web')) NOT NULL DEFAULT 'default',
    agent TEXT NULL,
    ota_reservation_id TEXT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id)
) PARTITION BY LIST (hotel_id);

CREATE TABLE reservation_details (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- Reservation's hotel
    reservation_id UUID NOT NULL,
    date DATE NOT NULL,
    room_id INT,
    plans_global_id INT REFERENCES plans_global(id),
    plans_hotel_id INT,
    plan_name TEXT,
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',
    number_of_people INT NOT NULL,
    price DECIMAL,
    cancelled UUID DEFAULT NULL,
    billable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, reservation_id, room_id, date, cancelled),
    FOREIGN KEY (reservation_id, hotel_id) REFERENCES reservations(id, hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id, hotel_id) REFERENCES rooms(id, hotel_id),
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id)
) PARTITION BY LIST (hotel_id);

CREATE TABLE reservation_addons (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id), -- Reservation's hotel
    reservation_detail_id UUID NOT NULL,
    addons_global_id INT REFERENCES addons_global(id),
    addons_hotel_id INT,
    addon_name TEXT,
    addon_type TEXT CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'parking', 'other')) DEFAULT 'other',
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL NOT NULL,
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (reservation_detail_id, hotel_id) REFERENCES reservation_details(id, hotel_id) ON DELETE CASCADE,
	FOREIGN KEY (addons_hotel_id, hotel_id) REFERENCES addons_hotel(id, hotel_id)
) PARTITION BY LIST (hotel_id);

CREATE TABLE reservation_clients (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id), -- Reservation's hotel
    reservation_details_id UUID NOT NULL, -- Reference to reservation_details table
    client_id UUID NOT NULL REFERENCES clients(id), -- Reference to clients table
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (reservation_details_id, hotel_id) REFERENCES reservation_details(id, hotel_id) ON DELETE CASCADE
) PARTITION BY LIST (hotel_id);

-- receipts table needs to be created before reservation_payments if there's a FK.
-- Moving receipts to 006_billing.sql and will adjust FK constraint in reservation_payments.
-- For now, I will remove the FK to receipts and add it in 006_billing.sql.

CREATE TABLE reservation_payments (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id), -- Reservation's hotel
    reservation_id UUID NOT NULL, -- Reference to reservations table
    date DATE NOT NULL,
    room_id INT,
    client_id UUID NOT NULL REFERENCES clients(id), -- Reference to clients table
    payment_type_id INT NOT NULL REFERENCES payment_types(id), -- Reference to payment_types table
    value DECIMAL,
    comment TEXT,
    invoice_id UUID DEFAULT NULL, -- Assuming invoices table will exist, will be created in 006_billing.sql
    receipt_id UUID DEFAULT NULL, -- Will be linked to receipts table in 006_billing.sql
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (reservation_id, hotel_id) REFERENCES reservations(id, hotel_id) ON DELETE CASCADE
    -- FOREIGN KEY (receipt_id, hotel_id) REFERENCES receipts(id, hotel_id) ON DELETE SET NULL -- This will be added in 006_billing.sql
) PARTITION BY LIST (hotel_id);

-- The ALTER TABLE for receipt_id on reservation_payments was already incorporated or will be handled with receipts table.
-- ALTER TABLE reservation_payments ADD COLUMN receipt_id UUID NULL;
-- COMMENT ON COLUMN reservation_payments.receipt_id IS 'Foreign key to the receipts table, linking multiple payments to a single receipt';
-- ALTER TABLE reservation_payments ADD CONSTRAINT fk_reservation_payments_receipts FOREIGN KEY (receipt_id, hotel_id) REFERENCES receipts(id, hotel_id) ON DELETE SET NULL;

CREATE TABLE reservation_rates (
   id UUID DEFAULT gen_random_uuid(),
   hotel_id INT NOT NULL REFERENCES hotels(id),
   reservation_details_id UUID NOT NULL,
   adjustment_type TEXT CHECK (adjustment_type IN ('base_rate', 'percentage', 'flat_fee')) DEFAULT 'base_rate',
   adjustment_value DECIMAL(10, 2) NOT NULL,
   tax_type_id INT REFERENCES tax_info(id),
   tax_rate DECIMAL(12,4),
   price NUMERIC(12,0) NOT NULL,
   net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   updated_by INT DEFAULT NULL REFERENCES users(id),
   PRIMARY KEY (hotel_id, id),
   FOREIGN KEY (reservation_details_id, hotel_id) REFERENCES reservation_details(id, hotel_id) ON DELETE CASCADE
) PARTITION BY LIST (hotel_id);


-- Drop existing check constraint
ALTER TABLE reservation_addons DROP CONSTRAINT reservation_addons_addon_type_check;

-- Add new check constraint including 'parking'
ALTER TABLE reservation_addons
ADD CONSTRAINT reservation_addons_addon_type_check
CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'other', 'parking'));
