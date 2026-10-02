# Loan Tracker release

## Implementation audit

The existing working files already contained the payment selector, optional downpayment,
Loan Tracker navigation below Inventory, LPG/Other tabs, loan creation, payment logging,
status badges, retained paid rows, and the three-second settlement toast.

This release adds payment and inventory row locks, payment retry request IDs, monetary
precision and input validation, readable 400/409 errors, database balance/status checks,
one loan per linked sale, protection against deleting linked sales, Supabase RLS for the
new tables, visible loading failures, race-safe tab loads, Cash reset on each new sale,
Philippine default dates, checked frontend builds, and unit/database tests.

The existing sales form records one product type and quantity per transaction. Its total
is unit price times quantity. It does not support a multi-product shopping cart. Revenue
continues to mean sale value, including credit sales; it is not cash collected. Payment
history is stored independently from sales revenue to avoid counting collections twice.

## Before release

1. Take a Supabase database backup and restore it into a staging database first.
2. Inspect `flyway_schema_history` to determine which migrations have run. Do not edit
   an applied migration, and do not run V7 twice. V8 and V9 are separate migrations.
3. If V7 is already applied, run the read-only checks in `docs/loan-preflight.sql`.
   Inspect pre-existing loan records for zero totals, balances inconsistent with total
   minus paid, incorrect status, duplicate sale links, and LPG loans without a linked sale.
   V8 refuses invalid data; reconcile it against payment history before release. Existing
   CASH sales must have downpayment zero. Do not silently discard or rewrite audit data.
4. Run CI with a disposable PostgreSQL database. It verifies the complete Flyway chain,
   schema validation, simultaneous payments, retry deduplication, cash sales, credit sales,
   inventory rollback, paid-record retention, and the restrictive sale foreign key.
5. Check existing admin credentials: change the old `admin123` password in Settings if
   it is still used. Existing users are not reset by this release.

## Render backend and Supabase migration

Use the existing Docker service with root directory `backend`. Set:

- `SPRING_PROFILES_ACTIVE=production`
- `DB_URL`: Supabase PostgreSQL JDBC URL, with SSL enabled (`sslmode=require`); use the
  direct connection or session pooler suitable for your Render networking.
- `DB_USER` and `DB_PASSWORD`: server-side database credentials.
- `JWT_SECRET`: a strong random secret of at least 32 bytes, never exposed to Vercel.
- `APP_CORS_ALLOWED_ORIGINS`: exact HTTPS frontend origins, separated by commas.
- `BOOTSTRAP_ADMIN_PASSWORD`: only needed if the users table is empty. Use a strong
  initial password; remove the variable after bootstrap. Existing databases do not need it.

Deploy the backend to staging. Flyway automatically applies V7 if pending, then V8 and V9,
before Hibernate validates the schema. Repeat against production only after staging passes.
Do not manually execute these scripts in Supabase SQL Editor while Flyway owns migrations;
manual execution without migration history reconciliation makes the next startup fail.

The application connects through Spring/JDBC. RLS on the new loan tables denies direct
Supabase Data API access unless policies are added; the JDBC role must own these tables
or have BYPASSRLS. A restricted JDBC role needs explicit policies and grants. If this
application does not use the Supabase Data API, disable it to protect existing public
schema tables as well. Review Supabase Security Advisor before release.

References: [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api),
[Render Docker](https://render.com/docs/docker),
[Render environment variables](https://render.com/docs/configure-environment-variables).

## Vercel frontend

1. Set `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api` for the appropriate
   Vercel environment. These values are compiled into the browser bundle: never put
   database passwords, service-role keys, or JWT signing secrets in `VITE_*` variables.
2. Use `pnpm install --frozen-lockfile`, build command `pnpm build`, output directory `dist`.
3. Redeploy the frontend after the backend migration succeeds. Missing API configuration
   fails the build; production no longer falls back to demo data.
4. Confirm your frontend domain is included in Render's CORS configuration.

Reference: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Smoke test after deployment

- Sign in; verify unauthenticated requests to `/api/loans` are rejected.
- Create a Cash sale: stock decreases, and no loan is created.
- Create an Utang sale without downpayment: one Unpaid loan appears.
- Create an Utang sale with downpayment: balance and initial payment match the sale.
- Try an excessive downpayment: no sale or stock change is committed.
- Create an Other loan, record partial payment, and verify yellow Partially Paid status.
- Settle each category: see `Amount Fully Paid!`, green Paid status, retained row, and
  disabled payment button. Submit the same payment request ID again: history stays unchanged.
- Verify a linked credit sale cannot be deleted, including after settlement.
- Refresh both tabs, inspect histories, and test on a mobile screen.

Record actual deployment URLs, migration versions, and results in your release notes.
This repository change alone does not verify or update the existing live deployments.

## Local checks

```sh
pnpm build
mvn -f backend/pom.xml test
```

To include database tests, point the following variables at a DISPOSABLE database, never
production. Tests create persistent test products, sales, and loans:

```sh
export RUN_DATABASE_TESTS=true
export DB_URL=jdbc:postgresql://localhost:5432/jjlpg_test
export DB_USER=jjlpg_test
export DB_PASSWORD=YOUR_TEST_DATABASE_PASSWORD
mvn -f backend/pom.xml verify
```

Java 21 is required. Database tests are skipped without `RUN_DATABASE_TESTS=true`.

## Recovery

If migration fails, keep the previous frontend running and investigate Flyway's error.
Do not drop loan tables or disable validation to get startup working. Once new loans have
been written, preserve V7/V8 tables and payment history when rolling back application code.
V8 tightens constraints: an older backend that deletes linked sales will be rejected by
PostgreSQL. Prefer fixing forward, and restore backups only with an explicit recovery plan
that accounts for all transactions recorded after the backup.

V9 adds the stored delivery method used on thermal receipts. See
[PT-210 receipt instructions](THERMAL_RECEIPTS.md) for printer setup and legacy data behavior.

## Verification performed for this change

Frontend TypeScript validation and the production build passed. All 12 backend tests
passed against disposable PostgreSQL 17, including the full Flyway chain. Browser checks
confirmed settlement toast, retained Paid row, disabled payment action, accessible paid
loan history, both tabs, Cash default, and the optional Utang downpayment. These checks
used synthetic local data; live deployment validation remains a release step.
