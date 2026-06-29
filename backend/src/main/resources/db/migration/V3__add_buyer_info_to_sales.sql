-- Add buyer info to existing sales table
ALTER TABLE sales ADD COLUMN buyer_name VARCHAR(255) DEFAULT 'Unknown' NOT NULL;
ALTER TABLE sales ADD COLUMN address VARCHAR(500) DEFAULT 'Unknown' NOT NULL;
