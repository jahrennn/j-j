-- Keep historical loan/payment amounts intact; no due date or limit is assumed.
CREATE TABLE public.credit_customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_key VARCHAR(255) NOT NULL UNIQUE,
    credit_limit NUMERIC(12,2),
    CONSTRAINT credit_limit_nonnegative CHECK (credit_limit IS NULL OR credit_limit >= 0)
);
INSERT INTO public.credit_customers (name, name_key)
SELECT min(borrower_name), lower(regexp_replace(btrim(borrower_name), '[[:space:]]+', ' ', 'g'))
FROM public.loans GROUP BY lower(regexp_replace(btrim(borrower_name), '[[:space:]]+', ' ', 'g'));
ALTER TABLE public.loans ADD COLUMN customer_id BIGINT REFERENCES public.credit_customers(id);
UPDATE public.loans l SET customer_id = c.id FROM public.credit_customers c
WHERE c.name_key = lower(regexp_replace(btrim(l.borrower_name), '[[:space:]]+', ' ', 'g'));
ALTER TABLE public.loans ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.loans ADD COLUMN due_date DATE;
ALTER TABLE public.loans ADD CONSTRAINT loan_due_date_valid CHECK (due_date IS NULL OR due_date >= loan_date);
CREATE INDEX idx_loans_customer ON public.loans(customer_id);
CREATE INDEX idx_loans_outstanding_due ON public.loans(due_date) WHERE remaining_balance > 0;
ALTER TABLE public.credit_customers ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE api_role text;
BEGIN
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.credit_customers FROM %I', api_role);
        EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.credit_customers_id_seq FROM %I', api_role);
    END LOOP;
END $$;
