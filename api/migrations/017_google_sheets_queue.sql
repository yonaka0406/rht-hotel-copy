CREATE TYPE task_status AS ENUM ('pending', 'processed', 'failed');

-- Google Sheets Queue Table
CREATE TABLE google_sheets_queue (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status task_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ DEFAULT NULL
);

-- Partial unique index to prevent duplicate pending tasks
CREATE UNIQUE INDEX idx_unique_pending_google_sheets_task ON google_sheets_queue (hotel_id, check_in, check_out) WHERE status = 'pending';

-- Indexes for performance
CREATE INDEX idx_google_sheets_queue_status ON google_sheets_queue(status);
CREATE INDEX idx_google_sheets_queue_hotel_id ON google_sheets_queue(hotel_id);
CREATE INDEX idx_google_sheets_queue_dates ON google_sheets_queue(check_in, check_out);
CREATE INDEX idx_google_sheets_queue_status_created_at ON google_sheets_queue(status, created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_google_sheets_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.* IS DISTINCT FROM OLD.*) THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_google_sheets_queue_updated_at
    BEFORE UPDATE ON google_sheets_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_google_sheets_queue_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON google_sheets_queue TO rhtsys_user;
GRANT USAGE, SELECT ON SEQUENCE google_sheets_queue_id_seq TO rhtsys_user;
