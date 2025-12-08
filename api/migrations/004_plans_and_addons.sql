CREATE TABLE tax_info (
   id SERIAL PRIMARY KEY,
   name TEXT NOT NULL,
   description TEXT,
   percentage DECIMAL(10,4) NOT NULL,
   visible BOOLEAN DEFAULT true,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   updated_by INT DEFAULT NULL REFERENCES users(id),
   UNIQUE (name)
);
INSERT INTO tax_info (name, percentage, created_by)
VALUES
    ('非課税', 0, 1),
    ('課税8%', 0.08, 1),
    ('課税10%', 0.10, 1);

CREATE TABLE plan_templates (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE NULL,
    name TEXT NOT NULL,
    template JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (hotel_id, name)
);
/*
CREATE TABLE plans_global (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name)
);

INSERT INTO plans_global (name, description, created_by)
VALUES
    ('素泊まり', '', 1),
    ('1食', '', 1),
    ('2食', '', 1),
    ('3食', '', 1),
    ('荷物キープ', '', 1);
*/
CREATE TABLE plans_hotel (
    id SERIAL,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    plans_global_id INT REFERENCES plans_global(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, name)
) PARTITION BY LIST (hotel_id);
/*
-- Table to explicitly hide a global plan for a specific hotel.
CREATE TABLE hotel_plan_exclusions (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    global_plan_id INTEGER NOT NULL REFERENCES plans_global(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (hotel_id, global_plan_id)
);

-- Create an index for faster lookups.
CREATE INDEX idx_hotel_plan_exclusions_hotel_id_global_plan_id ON hotel_plan_exclusions (hotel_id, global_plan_id);
*/
CREATE TABLE plans_rates (
    id SERIAL PRIMARY KEY,
    hotel_id INT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- hotel, NULL for global adjustments
    plans_global_id INT REFERENCES plans_global(id) ON DELETE CASCADE,
    plans_hotel_id INT,
    adjustment_type TEXT CHECK (adjustment_type IN ('base_rate', 'percentage', 'flat_fee')) NOT NULL,  -- Type of adjustment
    include_in_cancel_fee BOOLEAN NOT NULL DEFAULT FALSE,
    adjustment_value DECIMAL(10, 2) NOT NULL,
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (
         CASE
            WHEN adjustment_type IN ('base_rate', 'flat_fee')
            THEN FLOOR(adjustment_value / (1 + tax_rate))
            ELSE NULL
         END
    ) STORED,
    sales_category TEXT CHECK (sales_category IN ('accommodation', 'other')) DEFAULT 'accommodation',
    condition_type TEXT CHECK (condition_type IN ('no_restriction', 'day_of_week', 'month')) NOT NULL,  -- Type of condition
    condition_value TEXT NULL,  -- The specific condition (e.g., '土曜日', '2024-12-25', etc.)
    date_start DATE NOT NULL, -- Start of the applicable rate
    date_end DATE DEFAULT NULL, -- End of the applicable rate (NULL = no end date)    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id) ON DELETE CASCADE,
    CHECK (
        (plans_global_id IS NOT NULL AND plans_hotel_id IS NULL) OR
        (plans_global_id IS NULL AND plans_hotel_id IS NOT NULL)
    )
);
/*
CREATE TABLE addons_global (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    addon_type TEXT CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'parking', 'other')) DEFAULT 'other',
    description TEXT,
    price DECIMAL NOT NULL,
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name)
);

INSERT INTO addons_global (name, description, price, tax_type_id, tax_rate, created_by)
VALUES
    ('朝食', '', 0, 3, 0.1, 1),
    ('夕食', '', 0, 3, 0.1, 1),
    ('駐車場', '', 0, 3, 0.1, 1),
    ('お弁当', '', 0, 3, 0.1, 1);
*/
CREATE TABLE addons_hotel (
    id SERIAL,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    addons_global_id INT REFERENCES addons_global(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- Name of the add-on (e.g., Breakfast, Dinner, etc.)
    addon_type TEXT CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'parking', 'other')) DEFAULT 'other',
    description TEXT, -- Optional description
    price DECIMAL NOT NULL, -- Price of the add-on service
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, name)
) PARTITION BY LIST (hotel_id);

CREATE TABLE plan_addons (
    id SERIAL PRIMARY KEY,
    hotel_id INT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    plans_global_id INT REFERENCES plans_global(id) ON DELETE CASCADE,
    plans_hotel_id INT,
    addons_global_id INT REFERENCES addons_global(id) ON DELETE CASCADE,
    addons_hotel_id INT,
    addon_type TEXT CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'other')) DEFAULT 'other',
    price DECIMAL(10, 2) NOT NULL,
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
    sales_category TEXT CHECK (sales_category IN ('accommodation', 'other')) DEFAULT 'accommodation',
    date_start DATE NOT NULL,
    date_end DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (addons_hotel_id, hotel_id) REFERENCES addons_hotel(id, hotel_id) ON DELETE CASCADE,
    CHECK (
        (plans_global_id IS NOT NULL AND plans_hotel_id IS NULL) OR
        (plans_global_id IS NULL AND plans_hotel_id IS NOT NULL)
    ),
    CHECK (
        (addons_global_id IS NOT NULL AND addons_hotel_id IS NULL) OR
        (addons_global_id IS NULL AND addons_hotel_id IS NOT NULL)
    )
);


-- Drop existing check constraint
ALTER TABLE addons_global DROP CONSTRAINT addons_global_addon_type_check;

-- Add new check constraint including 'parking'
ALTER TABLE addons_global
ADD CONSTRAINT addons_global_addon_type_check
CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'other', 'parking'));


-- Drop existing check constraint
ALTER TABLE addons_hotel DROP CONSTRAINT addons_hotel_addon_type_check;

-- Add new check constraint including 'parking'
ALTER TABLE addons_hotel
ADD CONSTRAINT addons_hotel_addon_type_check
CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'other', 'parking'));

