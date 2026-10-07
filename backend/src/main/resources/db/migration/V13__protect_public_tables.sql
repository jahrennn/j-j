-- The browser uses the authenticated Spring API; it does not access these
-- tables through Supabase's Data API. Protect older tables created before RLS
-- was added. Flyway's metadata table is secured after Flyway releases its lock.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Reaffirm protection for app tables created by later migrations.
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tank_exchanges ENABLE ROW LEVEL SECURITY;

-- Supabase has anon/authenticated roles; plain PostgreSQL test installations
-- usually do not. Remove their direct table privileges where the roles exist.
DO $$
DECLARE
    api_role text;
BEGIN
    FOR api_role IN
        SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
    LOOP
        EXECUTE format(
            'REVOKE ALL PRIVILEGES ON TABLE public.users, public.products, public.sales, '
            || 'public.business_settings, public.loans, '
            || 'public.loan_payments, public.stock_movements, public.tank_exchanges FROM %I',
            api_role);
    END LOOP;
END $$;
