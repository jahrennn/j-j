# Restock planning, staff accounts, and activity records

## Restock planning

Open Inventory → Restock planning → Settings for a product. Owners can set:

- **Minimum stock:** the reserve to keep available (0–1,000,000 units).
- **Supplier lead time:** expected days between ordering and arrival (0–365).
- **Target coverage:** days of demand to cover after delivery (1–365).

Existing and new products initially use a 20-unit minimum, three-day lead time, and 14-day coverage. Each product can be changed independently. These are starting settings, not supplier-specific facts.

Forecasts use completed, non-deleted sales linked to the product over 30 calendar days, including today in Philippine time. Future-dated sales and earlier sales are excluded. Old unlinked sale records cannot contribute to a product's forecast. The daily average is units sold divided by 30; settings and returned-tank registers do not count as demand.

- Reorder point = minimum stock + ceiling(units sold × lead time / 30).
- Target stock = minimum stock + ceiling(units sold × (lead time + coverage) / 30).
- Estimated days remaining = stock × 30 / units sold, displayed to one decimal.
- At or below the reorder point, suggested quantity = max(0, target stock − current stock); otherwise zero.

“No recent sales” replaces the estimate when no linked sales occurred in the period. Minimum stock still applies. Suggestions use on-hand stock; the app does not track incoming supplier orders or automatically place purchases. Review the quantities before ordering. The Restock action prefills the suggestion, but stock changes only when the delivery is recorded. Dashboard alerts use the same returned forecast as Inventory.

## Staff roles

Each staff member should sign in with their own account. The existing local admin account becomes Owner, with its password retained. Open Staff accounts to add accounts, change roles, disable access, or reset passwords.

| Capability | Owner | Cashier | Driver |
|---|---|---|---|
| View inventory, selling prices, and forecasts | Yes | Yes | Yes |
| Record sales and view tank exchanges | Yes | Yes | No |
| View utang and record payment collections | Yes | Yes | Yes |
| Create Other loans / edit promised dates | Yes | Yes | No |
| Change prices, costs, stock, or restock settings | Yes | No | No |
| Read costs, gross/net profit, or expenses | Yes | No | No |
| Delete sales/products with own-password confirmation | Yes | No | No |
| Manage business settings, staff, and activity logs | Yes | No | No |

The backend enforces the matrix independently of the UI. Non-owner inventory and sales responses contain null for cost/profit fields; cashier CSV exports omit them. Drivers land on Loan Tracker, cashiers on Sales, and owners on Dashboard. Staff management exposes account details, never password hashes.

JWTs are bound to the immutable account ID and a session version. Accounts are reloaded from the database on every authenticated request. Disabling an account, changing a role, or resetting a password invalidates its existing sessions; re-enabling does not restore an old token. Old tokens from before this release require sign-in again. Changing your own username or password also signs you out. The last active owner cannot be demoted or disabled, and owners cannot disable or demote themselves through the staff screen. Login throttling is scoped per username, independently of role or source. Only failed credential checks count: five failures trigger a 15-minute cooldown for that account. Successful sign-ins reset its counter and do not consume retries. Server errors do not count. A throttled response includes a Retry-After header.

## Activity and attribution

Activity log is owner-only, paginated, and ordered by time. New price/cost changes capture before/after amounts. Stock events capture quantities, reason, and actor. Sales record the staff member and amount collected. Initial loan downpayments and subsequent collections record the collector both in payment history and the activity log. Payment retries do not create duplicate activity.

Audit events commit in the same transaction as the operation. Actors come from the authenticated backend principal; request bodies cannot choose them. Old sales and payments show “Unknown (legacy)” instead of inventing an actor. Historical stock movements keep their recorded actors. Activity starts when this release is installed; past price edits cannot be reconstructed. The app exposes no audit edit/delete endpoints. Password values and hashes are never included in activity details.

## Migration and rollout

The existing Spring/JDBC/Flyway architecture remains in place. V18 adds per-product planning settings, staff roles/access/session versions, sale/payment attribution, a forecast index, and the protected audit table. Existing users become Owners so access is preserved; review pre-existing accounts before release. A case-insensitive unique username index rejects ambiguous existing duplicate names; reconcile any such names before deploying. Existing stock counts, loans, and payments are preserved.

Use the normal backup/staging workflow. Deploy the backend with Flyway through V18, then the frontend. Do not edit previously applied migration files or manually run Flyway-owned migrations in production. All users must sign in again after updating. New audit tables have RLS enabled and Data API table/sequence grants revoked; keep JDBC access server-side. No new external authentication provider is required.

Useful authenticated endpoints:

- `GET /auth/me`
- `GET/POST /staff`, `PUT /staff/{id}`
- `GET /audit?page=0&size=25`
- `PUT /inventory/products/{id}/replenishment`
- `GET /inventory` includes each product's `replenishment` forecast.

## Verification

Run the frontend stock, receipt, and utang checks, TypeScript validation, and production build. Run Java 21 backend checks. For full integration checks, set `RUN_DATABASE_TESTS=true`, `DB_URL`, `DB_USER`, and `DB_PASSWORD` to a disposable PostgreSQL database before `mvn -f backend/pom.xml verify`; never use production for test fixtures.

The tests cover forecast thresholds, rounding, no sales, date-window boundaries, per-role denial and financial masking, driver collections, protected account management, password hashing, session invalidation, immutable account IDs, last-owner protection, and actor attribution. Browser verification uses separate owner/cashier/driver contexts and synthetic data, including disabling an account and checking the activity log.

Verification completed: 58 backend checks, 21 frontend checks, TypeScript validation, and the production build passed. Chrome verified owner restock settings and suggested quantity prefilling, staff creation, cashier sales, driver collections, before/after audit details, disabled-account sign-out, and mobile layout. A final read-only check verified the upgraded local app. V18 preserved the existing five products and total stock, two loan balances, and three payment records; only the existing admin account is present locally, now as Owner. Synthetic staff accounts and transactions were confined to a disposable database.
