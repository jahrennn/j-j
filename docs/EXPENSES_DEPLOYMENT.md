# Operating expenses and monthly net profit

The Expenses page appears immediately below Loan Tracker. Record gasoline/fuel, delivery salaries, maintenance, utilities, or other operating costs. Salary entries require the employee's name. Each entry stores its date, amount, description, payee, notes, and the signed-in user who recorded it.

## Profit rules

- Gross profit uses the sale's saved total and capital: sum of `total_amount - capital` for sales in the selected dates.
- Net profit = gross profit minus recorded operating expenses in the same dates. A negative result is shown as a loss.
- The dashboard defaults to the current calendar month in `Asia/Manila`. Expenses defaults to that same month; Sales Report uses its selected date range.
- Sales and Expenses offer `Today`, `1D` (yesterday), `7D`, `30D`, and `90D`. Multi-day presets include today and exactly that many calendar days; all presets use Philippine time. Custom start/end dates are inclusive. Gross profit, operating expenses, and net profit in the selected-date panel use the same dates.
- Changing dates immediately clears the previous profit totals while the selected period loads. Late responses from an older selection cannot replace the new period. A server response for a different range shows a retry error instead of unrelated totals.
- The expense date determines its month. Entering a past expense changes that past month's net profit. It does not reduce the current month a second time.
- Category filtering changes the expense list/breakdown only. Profit always deducts all expense categories for the selected dates.
- Voiding an expense requires a reason. It remains in history with the user and timestamp but stops reducing profit. To correct an expense, void it and record a replacement.
- Credit sales continue to contribute to gross profit when recorded, matching existing sales reporting. This figure is profit, not cash available; loan payments are not counted as new sales.

Example: monthly sales gross profit of PHP 10,000 minus PHP 1,500 fuel and PHP 3,000 salaries gives PHP 5,500 net profit.

## Deploy with automatic Render and Vercel builds

1. Take a database backup/export before deployment, as for any schema change. Confirm the deployed backend uses Flyway and `spring.jpa.hibernate.ddl-auto=validate` as in this repository. Do not change it to `create` or `create-drop`.
2. Push the complete change, including the new backend files, frontend files, and V14 migration. Your existing automatic builds can deploy Render and Vercel from the same push. On backend startup, Flyway automatically applies `V14__operating_expenses.sql` once to the configured Supabase database. This migration creates an expenses table and its indexes/security rules. It does not update, rename, or delete existing sales, stock, loan, product, or user records. Existing migrations must remain unchanged. This preservation check covers upgrading from V13; if production is older, inspect its other pending migrations too.
3. Check Render logs for successful Flyway migration to version 14 and application startup. If startup fails, investigate the backend failure; do not delete Flyway history or manually mark a failed migration successful.
4. The backend's PostgreSQL role must own the tables or have the existing appropriate RLS bypass capability. Keep database credentials on Render. The new expenses table has RLS enabled and no direct access for Supabase `anon`/`authenticated`; use the authenticated Spring API.
5. Confirm Vercel's frontend build also succeeds. Keep `VITE_API_BASE_URL` pointed to the Render backend's `/api` endpoint. If the new frontend is available while the old backend is still running, expense/profit requests may temporarily fail because the new endpoints are not available yet. Once Render is healthy, refresh the page or use Retry. A frontend redeploy is not required solely because it finished first.
6. Sign in, confirm Expenses appears below Loan Tracker, and compare the dashboard's gross profit with the existing sales report for the same dates. The initial expenses total is zero until entries are recorded.
7. Record an actual fuel or salary expense for the current month. Confirm net profit decreases by that amount and gross profit stays the same. Confirm previous-month reports stay the same. Use Void with a reason if the entry was incorrect.

For an uninterrupted rollout, release the backend before the frontend using your deployment controls. Simultaneous automatic deployment does not make this additive migration destructive; it can create a temporary period when expense endpoints are unavailable. The previous frontend can continue using the updated backend. Do not roll back by dropping the expenses table: it may already contain real records.

## API

All routes are under `/api` and require the existing authentication.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/expenses?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&category=FUEL&page=0&size=25` | Paginated history, including voided rows, and summary over all matching recorded rows |
| GET | `/expenses/profit` | Current Philippine calendar month's gross profit, expenses, and net profit |
| GET | `/expenses/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Profit for a selected inclusive date range; both dates required |
| POST | `/expenses` | Record an expense; `requestId` UUID prevents duplicate retries |
| POST | `/expenses/{id}/void` | Void an entry with `{ "reason": "..." }`; repeat requests preserve the first void audit |

Categories are `FUEL`, `SALARY`, `MAINTENANCE`, `UTILITIES`, and `OTHER`. Amounts must be positive with at most two decimal places. Reusing a request UUID with different details returns HTTP 409 instead of changing the original entry.

## Local verification

Run `npm run build` from the repository root. Run `mvn test` from `backend` for unit/contract tests without a database. For the database/API/security suite, use a disposable PostgreSQL database, never production:

```sh
RUN_DATABASE_TESTS=true \
DB_URL=jdbc:postgresql://127.0.0.1:5432/jjlpg_test \
DB_USER=your_test_user \
DB_PASSWORD=your_test_password \
mvn test
```

For Supabase-like permission checks, create test-only `anon` and `authenticated` roles in that disposable cluster before running tests. `DatabaseSecurityTest` checks RLS and those roles' effective privileges on the expenses table alongside existing application tables.

Implementation verification: frontend production build, backend Java 21 Docker build, existing backend tests, seven expense integration tests (including concurrent retries), and Supabase-like RLS checks passed locally. A populated disposable V13 database was upgraded to V14; before/after data dumps of the existing application tables and their sequences matched. Browser checks used mock data and verified fuel/salary recording, required employee names, net-profit deductions, and retained voided entries. These checks do not validate the credentials or configuration of the live deployment.

Date-filter follow-up: `pnpm test:dates` covers preset lengths, Philippine dates near UTC midnight, leap days/year boundaries, and picker selection. `pnpm test:stock` also checks that Sales sends identical dates to sales and profit and ignores older sales responses. Chrome with synthetic API data verified all presets and custom dates, date-specific expense deductions with voided rows excluded, a late profit response, the Expenses page, and a 390px layout using a US browser timezone. No production data was read or changed. This follow-up changes only the frontend; no new migration is required.
