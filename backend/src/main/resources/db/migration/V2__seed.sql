-- Seed default business settings and admin user initialization.
-- Admin user is created at startup via DataSeeder if empty.

INSERT INTO business_settings (id, business_name, contact_number, address) VALUES
    (1, 'Jahren and John LPG Trading', '+63 900 000 0000', '123 Market St., Manila, PH')
ON CONFLICT (id) DO NOTHING;

