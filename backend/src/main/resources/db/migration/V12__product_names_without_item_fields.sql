-- Preserve every saved name and loan description while removing sale item fields.
ALTER TABLE sales RENAME COLUMN item_name TO product_name;
ALTER TABLE sales DROP COLUMN item_type;
ALTER TABLE loans RENAME COLUMN items_purchased TO product_purchased;
