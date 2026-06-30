-- Add item_name to sales
ALTER TABLE sales ADD COLUMN item_name VARCHAR(255) NOT NULL DEFAULT 'Unknown Product';
