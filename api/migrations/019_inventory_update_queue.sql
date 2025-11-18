CREATE TYPE inventory_task_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE inventory_update_queue (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    log_id INTEGER, -- Optional: Link to a log entry if applicable
    service_name VARCHAR(255) NOT NULL,
    template_xml TEXT NOT NULL, -- The XML template used for the request
    payload JSONB NOT NULL, -- The inventory data (array of objects)
    status inventory_task_status NOT NULL DEFAULT 'pending',
    retries INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes for performance
CREATE INDEX idx_inventory_queue_status ON inventory_update_queue(status);
CREATE INDEX idx_inventory_queue_hotel_id ON inventory_update_queue(hotel_id);
CREATE INDEX idx_inventory_queue_status_created_at ON inventory_update_queue(status, created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_inventory_update_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.* IS DISTINCT FROM OLD.*) THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_update_queue_updated_at
    BEFORE UPDATE ON inventory_update_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_update_queue_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_update_queue TO rhtsys_user;
GRANT USAGE, SELECT ON SEQUENCE inventory_update_queue_id_seq TO rhtsys_user;
