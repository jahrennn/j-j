-- Retain request IDs even if a cash sale is later deleted, so a delayed retry
-- cannot create that sale again. Existing sales and inventory are unchanged.
CREATE TABLE public.sale_requests (
    request_id UUID PRIMARY KEY,
    request_hash VARCHAR(64) NOT NULL,
    sale_id BIGINT REFERENCES public.sales(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sale_requests_sale ON public.sale_requests (sale_id);
ALTER TABLE public.sale_requests ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE api_role text;
BEGIN
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
    LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.sale_requests FROM %I', api_role);
    END LOOP;
END $$;
