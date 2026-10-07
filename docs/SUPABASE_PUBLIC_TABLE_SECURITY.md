# Supabase public-table security alert

The Spring Boot backend connects to Supabase through JDBC. The browser talks
only to the authenticated Spring API; it does not need Supabase's Data API.
Tables created by the original schema migration (`users`, `products`, `sales`,
and `business_settings`) lacked row-level security (RLS). In Supabase's exposed
`public` schema, that can make sensitive data accessible through the Data API
when API roles have table grants. The Flyway metadata table may be flagged too.

## Immediate containment

If nothing else uses Supabase REST, GraphQL, or Supabase client libraries,
open the Supabase Dashboard's **Data API** integration overview and turn
**Enable Data API** off. The Spring/JDBC backend will keep using its database
connection. If another client uses the Data API, assess that client before
turning it off; deploy the RLS/grant migration promptly instead.

For immediate SQL containment before the backend release, first confirm the
Render `DB_USER` owns the five flagged tables (or has suitable membership in
the owner role), and wait until
no backend deployment or Flyway migration is running. Then run this in the
Supabase SQL Editor. The later V13 migration and startup step safely repeat
these changes:

```sql
SELECT c.relname AS table_name, pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('flyway_schema_history', 'users', 'products',
                    'business_settings', 'sales');
```

Compare `owner` with Render's `DB_USER` (do not paste its password anywhere).
If they differ, use a staging database first to confirm the Spring API still
works after RLS is enabled. The role that runs V13 and the startup protection
must be able to alter the tables and revoke grants; `BYPASSRLS` alone is not
permission to do that.

```sql
BEGIN;
ALTER TABLE public.flyway_schema_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE
  public.flyway_schema_history, public.users, public.products,
  public.business_settings, public.sales
FROM anon, authenticated;
COMMIT;
```

These commands change access control only. They do not edit or remove rows.

## Permanent repository fix

`V13__protect_public_tables.sql` enables RLS on the eight application tables
and removes direct table privileges from Supabase's `anon` and `authenticated`
roles. Immediately after Flyway finishes, the backend also enables RLS on
`flyway_schema_history` and revokes those roles' table privileges. Flyway's
history table must be changed after migrations because Flyway locks it while
they run. These changes add no public policies.
The migration role must own these tables or be able to act as their owner.
The runtime role must own the tables, have `BYPASSRLS`, or have suitable RLS
policies and grants. The migration does
not update, delete, or rename any saved data. It runs automatically when the
updated Render backend starts. Do not manually mark Flyway version 13 applied.

Verify the database role and the migration in staging before deploying to
production. In the Supabase SQL Editor, this read-only query should return
`rls_enabled = true` for every app table after the backend deploy:

```sql
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;
```

If the query lists another public table with `rls_enabled = false`, identify
its owner and purpose before changing it. V13 covers this application's known
tables; it does not alter unrelated Supabase or third-party tables. Review
Supabase Security Advisor again after the release, and verify login, inventory,
sales, loans, and settings through the app.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api).
