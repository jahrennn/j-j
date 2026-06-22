-- Seed products, sales, and business settings.
-- Admin user is created at startup via DataSeeder (BCrypt hash generated in Java).

INSERT INTO products (sku, name, type, stock, unit_price) VALUES
    ('RF-11', 'LPG Refill (11kg)', 'LPG_REFILL', 142, 950.00),
    ('RF-22', 'LPG Refill (22kg)', 'LPG_REFILL', 64, 1850.00),
    ('TK-11', 'LPG Tank (11kg)', 'LPG_TANK', 38, 2800.00),
    ('TK-22', 'LPG Tank (22kg)', 'LPG_TANK', 12, 4600.00),
    ('TK-50', 'LPG Tank (50kg)', 'LPG_TANK', 6, 9200.00);

INSERT INTO business_settings (id, business_name, contact_number, address) VALUES
    (1, 'Jahren and John LPG Trading', '+63 900 000 0000', '123 Market St., Manila, PH');

INSERT INTO sales (sale_date, transaction_id, item_type, quantity, total_amount)
SELECT
    (CURRENT_DATE - ((i / 2)::int))::date,
    'TXN-' || LPAD((10248 - i)::text, 5, '0'),
    CASE WHEN i % 5 = 0 THEN 'LPG_TANK' ELSE 'LPG_REFILL' END,
    CASE WHEN i % 5 = 0 THEN 1 + (i % 2) ELSE 1 + (i % 4) END,
    CASE
        WHEN i % 5 = 0 THEN (1 + (i % 2)) * 2800.00
        ELSE (1 + (i % 4)) * 950.00
    END
FROM generate_series(0, 47) AS s(i);
