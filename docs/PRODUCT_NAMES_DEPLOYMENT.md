# Product-only labels and safe deployment

Flyway migration `V12__product_names_without_item_fields.sql` renames
`sales.item_name` to `sales.product_name`, drops the redundant
`sales.item_type` category, and renames `loans.items_purchased` to
`loans.product_purchased`. Renaming the two columns preserves their exact
stored text. V12 does not update any product name, SKU, stock, capital, SRP,
sale amount, buyer, loan balance, or payment.

The legacy `products.type` column remains internally so existing product rows
and their historical values are untouched. New products are classified as
`LPG_TANK` automatically. The type selector and Refill choice are removed from
the app. Existing names that contain “Refill” stay exactly as saved, including
on old sales and receipts. If those current products really are tanks, rename
their *current product names* in Inventory after deployment. Old sale names
remain as recorded.

The Tank Exchange Register uses the current inventory catalog for both tank
choices, including brand-only names and products with an older `LPG_REFILL`
category. A returned tank may have zero saleable stock; the supplied tank must
have enough stock for the sale.

## Release order

1. Back up Supabase and verify restoration in staging. Check the production
   Flyway history before release; the backend will apply any pending V10, V11,
   and V12 migrations in order.
2. Test the release in staging with a copy of sales, loans, and products.
   Compare row counts, product stock/prices, historical sale amounts/capital,
   and loan balances before and after startup.
3. Schedule a brief maintenance window and stop writes before deploying the
   Render backend. V12 renames/removes columns used by the previous backend,
   so the previous backend must not serve requests while Flyway runs. Flyway
   runs V12 at startup; do not execute the migration manually in Supabase SQL
   Editor. Confirm the new backend is healthy before restoring traffic. It
   temporarily emits legacy response aliases so an older open frontend can
   still read sales, inventory, and loan records. An older product editor
   cannot silently change stock: the backend rejects a changed stock value
   and asks the user to refresh the app and use Adjust Stock.
4. After the backend is healthy, deploy the Vercel frontend. Refresh the app
   and verify Sales, Inventory, Loan Tracker, receipts, and Tank Exchange Register.

If Vercel is updated before Render, the previous backend still requires a
`type` field for product creation. The frontend now sends `LPG Tank` internally
for that request, but the old backend does not support stock movement history
or tank exchange records. Deploy and verify the backend before using those
features. A tank exchange sale is blocked if the backend lacks the exchange
endpoint, preventing an untracked exchange sale.

V12 was tested both against populated V11 tables and as part of the full
Flyway/Hibernate integration suite on a disposable PostgreSQL database.
The release cannot be zero-downtime while V12 drops fields used by the old
backend. Verify a production-like database copy in staging before the release;
tests against a disposable database do not prove that production has no manual
schema changes or pending earlier migrations.
