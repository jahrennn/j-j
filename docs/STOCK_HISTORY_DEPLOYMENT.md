# Stock history and fixed sale profit

This release adds Flyway migration `V10__stock_movements.sql`. It creates an
append-only stock movement ledger and inserts one `OPENING` row for each product
that already exists. The opening row reflects stock at deployment time; earlier
stock changes cannot be reconstructed and are not invented.

Sales already store total amount and capital at checkout. The sales report now
uses those saved values. Changing product SRP or capital affects only sales made
after the change. Sales created before the capital snapshot column existed may
have a stored capital of zero; their true historical capital cannot be inferred
from today's product price.

## Release sequence

1. Export a Supabase database backup and verify it can be restored in staging.
2. Run the backend test suite with a disposable PostgreSQL database. It applies
   the full Flyway chain through V10 and checks sale profit and movement history.
3. Deploy the Spring Boot backend. Flyway applies V10 automatically at startup.
   Do not run V10 manually in the Supabase SQL Editor while Flyway owns migrations.
4. Deploy the Vercel frontend after the backend is healthy. The Inventory page
   will then show movement history and a separate Adjust Stock action.
5. Record a test sale, restock, and stock correction. Confirm the movement rows
   show the correct quantity, reason, and signed-in username. Change a product
   capital and SRP and verify the old sale's profit is unchanged while a new
   sale uses the new values.

The ledger is available through `GET /api/inventory/movements`, with optional
`productId`, `page`, and `size` parameters. Each page has at most 100 rows.
Stock changes occur in the same database transaction as their ledger entries.
The Supabase Data API cannot access the new table because row-level security is
enabled without public policies; the authenticated Spring API uses the database
owner connection as with the existing loan tables.
