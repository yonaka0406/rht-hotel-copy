-- Migration: Drop deprecated get_available_plans_for_hotel function
-- This migration removes the deprecated function that was generating plan_key
-- The system now uses get_available_plans_with_rates_and_addons for plan retrieval

DROP FUNCTION IF EXISTS get_available_plans_for_hotel(INT);