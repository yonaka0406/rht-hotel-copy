CREATE TABLE daily_plan_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    month DATE NOT NULL, -- The month being projected
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    plans_global_id INT REFERENCES plans_global(id) ON DELETE SET NULL,
    plans_hotel_id INT,
    plan_name TEXT NOT NULL,
    confirmed_stays INT NOT NULL DEFAULT 0,
    pending_stays INT NOT NULL DEFAULT 0,
    in_talks_stays INT NOT NULL DEFAULT 0,
    cancelled_stays INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id) ON DELETE CASCADE,
    UNIQUE (metric_date, month, hotel_id, plans_global_id, plans_hotel_id)
);