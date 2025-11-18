-- 019_ota_xml_queue.sql

CREATE TABLE IF NOT EXISTS ota_xml_queue (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    xml_body TEXT NOT NULL,
    current_request_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retries INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_ota_xml_queue_hotel_id FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

COMMENT ON TABLE ota_xml_queue IS 'Queue for asynchronous OTA XML requests to handle rate limits.';
COMMENT ON COLUMN ota_xml_queue.hotel_id IS 'The ID of the hotel associated with the request.';
COMMENT ON COLUMN ota_xml_queue.service_name IS 'The name of the OTA service being called (e.g., NetStockBulkAdjustmentService).';
COMMENT ON COLUMN ota_xml_queue.xml_body IS 'The full XML payload to be sent to the OTA service.';
COMMENT ON COLUMN ota_xml_queue.current_request_id IS 'Our internal request ID for tracking purposes.';
COMMENT ON COLUMN ota_xml_queue.status IS 'Current status of the queue item (pending, processing, completed, failed).';
COMMENT ON COLUMN ota_xml_queue.retries IS 'Number of times the request has been retried.';
COMMENT ON COLUMN ota_xml_queue.last_error IS 'Details of the last error encountered during processing.';
COMMENT ON COLUMN ota_xml_queue.created_at IS 'Timestamp when the request was added to the queue.';
COMMENT ON COLUMN ota_xml_queue.processed_at IS 'Timestamp when the request was last processed or completed.';

-- Drop the broad index
DROP INDEX IF EXISTS idx_ota_xml_queue_status_created_at;

-- Create a partial index for active statuses
CREATE INDEX idx_ota_xml_queue_active_status_created_at ON ota_xml_queue (status, created_at) WHERE status IN ('pending', 'processing');

-- Create a composite index on (hotel_id, status)
CREATE INDEX idx_ota_xml_queue_hotel_status ON ota_xml_queue (hotel_id, status);


