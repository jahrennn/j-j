-- Keep older receipts printable while preserving the exact choice for new sales.
ALTER TABLE sales ADD COLUMN delivery_method VARCHAR(20) NOT NULL DEFAULT 'Pick up';
UPDATE sales SET delivery_method = CASE
    WHEN lower(trim(address)) = 'pick up' THEN 'Pick up'
    ELSE 'Deliver'
END;
ALTER TABLE sales ADD CONSTRAINT sales_delivery_method_valid
    CHECK (delivery_method IN ('Pick up', 'Deliver'));
