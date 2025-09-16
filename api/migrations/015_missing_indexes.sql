CREATE INDEX idx_reservations_client_id_status ON reservations (reservation_client_id, status);
CREATE INDEX idx_clients_name_kana ON clients (name_kana);
CREATE INDEX idx_reservation_details_hotel_billable_date_res_id ON reservation_details (hotel_id, billable, date, reservation_id);
CREATE INDEX idx_reservation_payments_res_id_payment_type_id ON reservation_payments (reservation_id, payment_type_id);
CREATE INDEX idx_reservation_addons_hotel_res_detail_id ON reservation_addons (hotel_id, reservation_detail_id);
CREATE INDEX idx_reservation_clients_res_details_id_client_id ON reservation_clients (reservation_details_id, client_id);
CREATE INDEX idx_reservation_details_res_id_date_billable ON reservation_details (reservation_id, date, billable);
CREATE INDEX idx_invoices_hotel_id_year_month ON invoices (hotel_id, date_part('year', date), date_part('month', date));
CREATE INDEX idx_reservation_details_hotel_id_year_month_billable_res_id_room_id ON reservation_details (hotel_id, date_part('year', date), date_part('month', date), billable, reservation_id, room_id);
CREATE INDEX idx_reservation_rates_hotel_id_res_details_id ON reservation_rates (hotel_id, reservation_details_id);
CREATE INDEX idx_clients_name ON clients (name);
CREATE INDEX idx_addresses_client_id ON addresses (client_id);
CREATE INDEX idx_clients_group_order ON clients (client_group_id, legal_or_natural_person, name_kana, name_kanji, name);
CREATE INDEX idx_clients_customer_id ON clients (customer_id);
CREATE INDEX idx_reservation_payments_client_id ON reservation_payments (client_id);
CREATE INDEX idx_crm_actions_assigned_to_datetime ON crm_actions (assigned_to, action_datetime DESC);
CREATE INDEX idx_crm_actions_client_id_datetime ON crm_actions (client_id, action_datetime DESC);
CREATE INDEX idx_reservation_details_hotel_room_date_cancelled ON reservation_details (hotel_id, room_id, date) WHERE cancelled IS NULL;
CREATE INDEX idx_logs_reservation_record_id_action ON logs_reservation (record_id, action);
CREATE INDEX idx_logs_clients_record_id_action ON logs_clients (record_id, action);
CREATE INDEX idx_reservations_hotel_id_created_at ON reservations (hotel_id, created_at);
CREATE INDEX idx_reservations_hotel_id_check_in ON reservations (hotel_id, check_in);
CREATE INDEX idx_reservation_details_reservation_id_hotel_id ON reservation_details (reservation_id, hotel_id);
CREATE INDEX idx_waitlist_entries_hotel_id_status_req_date ON waitlist_entries (hotel_id, status, requested_check_in_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_capacity_name ON vehicle_categories (capacity_units_required, name);
CREATE INDEX IF NOT EXISTS idx_parking_spots_is_active_parking_lot_id ON parking_spots (is_active, parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_reservation_parking_hotel_id_date_cancelled ON reservation_parking (hotel_id, date, cancelled);
CREATE INDEX IF NOT EXISTS idx_reservation_details_id_hotel_id ON reservation_details (id, hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_id_hotel_id ON reservations (id, hotel_id);
CREATE INDEX IF NOT EXISTS idx_plans_global_name ON plans_global (name);
CREATE INDEX IF NOT EXISTS idx_plans_hotel_hotel_id_name ON plans_hotel (hotel_id, name);
CREATE INDEX IF NOT EXISTS idx_plans_hotel_hotel_id_id ON plans_hotel (hotel_id, id);
CREATE INDEX IF NOT EXISTS idx_plan_templates_hotel_id_name ON plan_templates (hotel_id, name);
CREATE INDEX IF NOT EXISTS idx_plans_hotel_hotel_id_plans_global_id ON plans_hotel (hotel_id, plans_global_id);
CREATE INDEX IF NOT EXISTS idx_plan_addons_global_plan_hotel_id ON plan_addons (plans_global_id, plans_hotel_id);
CREATE INDEX IF NOT EXISTS idx_plan_addons_hotel_plan_hotel_id_global_id ON plan_addons (plans_hotel_id, hotel_id, plans_global_id);
CREATE INDEX IF NOT EXISTS idx_plans_rates_global_plan_hotel_id ON plans_rates (plans_global_id, plans_hotel_id);
CREATE INDEX IF NOT EXISTS idx_plans_rates_hotel_plan_hotel_id_global_id ON plans_rates (plans_hotel_id, hotel_id, plans_global_id);
CREATE INDEX IF NOT EXISTS idx_plans_rates_date_start_date_end ON plans_rates (date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_plans_rates_order_by_fields ON plans_rates (adjustment_type, condition_type DESC, date_start, plans_global_id, hotel_id, plans_hotel_id);
CREATE INDEX IF NOT EXISTS idx_plans_rates_group_by_fields ON plans_rates (condition_type, adjustment_type, condition_value, tax_type_id, tax_rate);
-- Add GIN index for related_clients JSONB column
CREATE INDEX IF NOT EXISTS idx_projects_related_clients ON projects USING GIN (related_clients jsonb_path_ops);

-- Enable pg_trgm extension and add GIN index for project_name for ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS trgm_idx_project_name ON projects USING GIN (project_name gin_trgm_ops);

-- Add B-tree index for project_name for sorting (if not covered by GIN index)
CREATE INDEX IF NOT EXISTS idx_projects_project_name ON projects (project_name);

-- reservation_details
CREATE INDEX IF NOT EXISTS idx_reservation_details_hotel_date_cancelled_billable_res_id_id ON reservation_details (hotel_id, date, cancelled, billable, reservation_id, id);
CREATE INDEX IF NOT EXISTS idx_reservation_details_hotel_id_plans_global_id_plans_hotel_id ON reservation_details (hotel_id, plans_global_id, plans_hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservation_details_hotel_id_room_id ON reservation_details (hotel_id, room_id);

-- reservations
CREATE INDEX IF NOT EXISTS idx_reservations_id_hotel_status_type ON reservations (id, hotel_id, status, type);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in_check_out ON reservations (check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_client_id ON reservations (reservation_client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations (created_at);

-- rooms
CREATE INDEX IF NOT EXISTS idx_rooms_id_hotel_for_sale ON rooms (id, hotel_id, for_sale);

-- reservation_addons
CREATE INDEX IF NOT EXISTS idx_reservation_addons_hotel_res_detail_id_global_hotel_addon_name ON reservation_addons (hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name);
CREATE INDEX IF NOT EXISTS idx_reservation_addons_hotel_res_detail_id_quantity_price ON reservation_addons (hotel_id, reservation_detail_id, quantity, price);

-- reservation_clients
CREATE INDEX IF NOT EXISTS idx_reservation_clients_res_details_id_client_id ON reservation_clients (reservation_details_id, client_id);

-- reservation_payments
CREATE INDEX IF NOT EXISTS idx_reservation_payments_res_id_hotel_id ON reservation_payments (reservation_id, hotel_id);

-- Add GIN indexes for ILIKE search columns
CREATE INDEX IF NOT EXISTS trgm_idx_client_name ON clients USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_idx_client_name_kana ON clients USING GIN (name_kana gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_idx_client_name_kanji ON clients USING GIN (name_kanji gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_idx_client_email ON clients USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_idx_client_phone ON clients USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_idx_reservations_ota_reservation_id ON reservations USING GIN (ota_reservation_id gin_trgm_ops);

-- Add indexes for joins and filters
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id_reservation_client_id ON reservations (hotel_id, reservation_client_id);
CREATE INDEX IF NOT EXISTS idx_reservation_payments_hotel_id_client_id_reservation_id ON reservation_payments (hotel_id, client_id, reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_clients_hotel_id_client_id_reservation_details_id ON reservation_clients (hotel_id, client_id, reservation_details_id);
CREATE INDEX IF NOT EXISTS idx_reservation_details_id_reservation_id ON reservation_details (id, reservation_id);

CREATE INDEX IF NOT EXISTS idx_payment_types_transaction_id ON payment_types (transaction, id);
CREATE INDEX IF NOT EXISTS idx_tax_info_percentage_name ON tax_info (percentage, name);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_tier_name_hotel_id ON loyalty_tiers (tier_name, hotel_id);
CREATE INDEX IF NOT EXISTS idx_users_status_role_email_id ON users (status_id, role_id, email, id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider_provider_user_id ON users (auth_provider, provider_user_id);