-- Migration: Add Google Calendar Integration Fields
-- Timestamp: {{YYYY-MM-DDTHH:MM:SSZ}} (Worker will replace this with actual timestamp)
-- Description: Adds necessary columns to 'users' and 'crm_actions' tables for Google Calendar integration.

-- Add columns for Google Calendar integration to the users table
-- Ensure this script is idempotent (can be run multiple times without error)

DO $$
BEGIN
    RAISE NOTICE 'Starting migration for users table: Adding Google Calendar fields...';

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='google_calendar_id') THEN
        ALTER TABLE public.users ADD COLUMN google_calendar_id TEXT NULL;
        RAISE NOTICE 'Column users.google_calendar_id added.';
    ELSE
        RAISE NOTICE 'Column users.google_calendar_id already exists.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='sync_google_calendar') THEN
        ALTER TABLE public.users ADD COLUMN sync_google_calendar BOOLEAN DEFAULT FALSE NULL;
        RAISE NOTICE 'Column users.sync_google_calendar added.';
    ELSE
        RAISE NOTICE 'Column users.sync_google_calendar already exists.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='google_access_token') THEN
        ALTER TABLE public.users ADD COLUMN google_access_token TEXT NULL;
        RAISE NOTICE 'Column users.google_access_token added.';
    ELSE
        RAISE NOTICE 'Column users.google_access_token already exists.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='google_refresh_token') THEN
        ALTER TABLE public.users ADD COLUMN google_refresh_token TEXT NULL;
        RAISE NOTICE 'Column users.google_refresh_token added.';
    ELSE
        RAISE NOTICE 'Column users.google_refresh_token already exists.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='google_token_expiry_date') THEN
        ALTER TABLE public.users ADD COLUMN google_token_expiry_date TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Column users.google_token_expiry_date added.';
    ELSE
        RAISE NOTICE 'Column users.google_token_expiry_date already exists.';
    END IF;

    -- New column for last sync timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='last_successful_google_sync') THEN
        ALTER TABLE public.users ADD COLUMN last_successful_google_sync TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Column users.last_successful_google_sync added.';
    ELSE
        RAISE NOTICE 'Column users.last_successful_google_sync already exists.';
    END IF;

    RAISE NOTICE 'Migration for users table completed.';
END $$;

-- Add columns for Google Calendar event details to the crm_actions table
-- Ensure this script is idempotent

DO $$
BEGIN
    RAISE NOTICE 'Starting migration for crm_actions table: Adding Google Calendar event fields...';

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_actions' AND column_name='google_calendar_event_id') THEN
        ALTER TABLE public.crm_actions ADD COLUMN google_calendar_event_id TEXT NULL;
        RAISE NOTICE 'Column crm_actions.google_calendar_event_id added.';
    ELSE
        RAISE NOTICE 'Column crm_actions.google_calendar_event_id already exists.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_actions' AND column_name='google_calendar_html_link') THEN
        ALTER TABLE public.crm_actions ADD COLUMN google_calendar_html_link TEXT NULL;
        RAISE NOTICE 'Column crm_actions.google_calendar_html_link added.';
    ELSE
        RAISE NOTICE 'Column crm_actions.google_calendar_html_link already exists.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_actions' AND column_name='synced_with_google_calendar') THEN
        ALTER TABLE public.crm_actions ADD COLUMN synced_with_google_calendar BOOLEAN DEFAULT FALSE NULL;
        RAISE NOTICE 'Column crm_actions.synced_with_google_calendar added.';
    ELSE
        RAISE NOTICE 'Column crm_actions.synced_with_google_calendar already exists.';
    END IF;

    RAISE NOTICE 'Migration for crm_actions table completed.';
END $$;

RAISE NOTICE 'Migration 001_add_google_calendar_fields.sql completed successfully.';
