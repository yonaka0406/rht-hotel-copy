-- Migration: Create user_saved_search table for storing user-specific saved searches
CREATE TABLE user_saved_search (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    filters JSONB NOT NULL,
    favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_saved_search_user_id ON user_saved_search(user_id);
CREATE INDEX idx_user_saved_search_favorite ON user_saved_search(favorite); 