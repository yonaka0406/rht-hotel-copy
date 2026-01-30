-- Create partitioned logs_cron table
CREATE TABLE logs_cron (
    id UUID DEFAULT gen_random_uuid(),
    job_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'running', 'success', 'failed'
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at) -- Partition key must be part of PK
) PARTITION BY RANGE (created_at);

-- Create indexes on parent table (will propagated to partitions)
CREATE INDEX idx_logs_cron_job_name ON logs_cron(job_name);
CREATE INDEX idx_logs_cron_created_at ON logs_cron(created_at);
CREATE INDEX idx_logs_cron_status ON logs_cron(status);

-- Create partitions for current and future years (5 years)
CREATE TABLE logs_cron_2026 PARTITION OF logs_cron FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE logs_cron_2027 PARTITION OF logs_cron FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE logs_cron_2028 PARTITION OF logs_cron FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE logs_cron_2029 PARTITION OF logs_cron FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');
CREATE TABLE logs_cron_2030 PARTITION OF logs_cron FOR VALUES FROM ('2030-01-01') TO ('2031-01-01');

-- Default partition for safety
CREATE TABLE logs_cron_default PARTITION OF logs_cron DEFAULT;
