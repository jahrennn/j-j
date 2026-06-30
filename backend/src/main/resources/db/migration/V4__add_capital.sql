-- Add capital to products
ALTER TABLE products ADD COLUMN capital NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Add capital to sales
ALTER TABLE sales ADD COLUMN capital NUMERIC(12, 2) NOT NULL DEFAULT 0;
