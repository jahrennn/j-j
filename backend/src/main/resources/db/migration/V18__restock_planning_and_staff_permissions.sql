ALTER TABLE public.products
    ADD COLUMN minimum_stock INTEGER NOT NULL DEFAULT 20 CHECK (minimum_stock BETWEEN 0 AND 1000000),
    ADD COLUMN lead_time_days INTEGER NOT NULL DEFAULT 3 CHECK (lead_time_days BETWEEN 0 AND 365),
    ADD COLUMN coverage_days INTEGER NOT NULL DEFAULT 14 CHECK (coverage_days BETWEEN 1 AND 365);
ALTER TABLE public.users
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER','CASHIER','DRIVER')),
    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_users_username_casefold ON public.users(lower(username));
ALTER TABLE public.loan_payments ADD COLUMN collected_by VARCHAR(100) NOT NULL DEFAULT 'Unknown (legacy)';
ALTER TABLE public.sales ADD COLUMN recorded_by VARCHAR(100) NOT NULL DEFAULT 'Unknown (legacy)';
CREATE INDEX idx_sales_product_forecast ON public.sales(product_id, sale_date);
CREATE TABLE public.audit_events (
    id BIGSERIAL PRIMARY KEY,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_events_created ON public.audit_events(created_at DESC, id DESC);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE api_role text; BEGIN
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM %I', api_role);
        EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.audit_events_id_seq FROM %I', api_role);
    END LOOP;
END $$;
