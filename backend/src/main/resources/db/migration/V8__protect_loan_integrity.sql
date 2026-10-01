-- Preserve V7 checksums on databases where it has already been applied.
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_valid CHECK (payment_method IN ('CASH', 'UTANG'));
ALTER TABLE sales ADD CONSTRAINT sales_downpayment_valid CHECK (
    downpayment >= 0 AND downpayment <= total_amount AND (payment_method = 'UTANG' OR downpayment = 0)
);
ALTER TABLE loans ADD CONSTRAINT loans_balance_valid CHECK (
    total_amount > 0 AND amount_paid <= total_amount AND remaining_balance = total_amount - amount_paid
);
ALTER TABLE loans ADD CONSTRAINT loans_status_matches_balance CHECK (
    (status = 'UNPAID' AND amount_paid = 0 AND remaining_balance > 0) OR
    (status = 'PARTIALLY_PAID' AND amount_paid > 0 AND remaining_balance > 0) OR
    (status = 'PAID' AND remaining_balance = 0)
);
ALTER TABLE loans ADD CONSTRAINT loans_category_matches_sale CHECK (
    (category = 'LPG' AND sale_id IS NOT NULL) OR (category = 'OTHER' AND sale_id IS NULL)
);
CREATE UNIQUE INDEX idx_loans_unique_sale ON loans(sale_id) WHERE sale_id IS NOT NULL;
ALTER TABLE loans DROP CONSTRAINT loans_sale_id_fkey;
ALTER TABLE loans ADD CONSTRAINT loans_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT;
-- These tables are accessed through the authenticated Spring API, not the Supabase Data API.
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- Optional request IDs support old clients while new clients retry safely.
ALTER TABLE loan_payments ADD COLUMN request_id UUID;
CREATE UNIQUE INDEX idx_loan_payment_request ON loan_payments(loan_id, request_id) WHERE request_id IS NOT NULL;
