-- Link sales to products for dynamic profit recalculation
ALTER TABLE sales ADD COLUMN product_id BIGINT REFERENCES products(id) ON DELETE SET NULL;
