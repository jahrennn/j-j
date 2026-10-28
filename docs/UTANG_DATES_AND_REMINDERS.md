# Utang promised dates and reminders

## Using the feature

Record an Utang sale or Other loan with an optional promised payment date. In Loan Tracker, click the date (or **Set promised date**) to change or clear it. Dates must be on or after the loan date; historical promised dates are allowed for historical loans.

Choose **All utang**, **LPG Loans**, or **Other Loans**, then filter overdue, due today, upcoming, or no promised date. Overdue means a positive balance with a promised date strictly before today's Philippine date. Paid loans never appear overdue. Summary totals follow the selected category, independent of search and date filter.

Choose **Reminder** on an outstanding loan to fetch its current balance and business settings, edit the message, and copy it into SMS or Messenger. If clipboard access is unavailable, select and copy the text manually. Copying is not a delivery record. No automatic sending or scheduled notifications are configured.

## Credit limit removal

Customer credit-limit controls, account suggestions, management endpoints, and server-side restrictions have been removed. Existing loans and payment histories remain intact. New utang does not create or require a customer credit account, and previously saved limits have no effect on new loans or sales.

V16 has already been applied to the local database and must remain unchanged for Flyway checksum compatibility. V17 makes the historical `loans.customer_id` column optional. The old protected customer table and historical references remain stored for recovery; the application no longer reads or writes them. Do not delete applied migrations or rewrite their checksums.

## Release

Deploy the backend first. Flyway applies all pending migrations through V17, then Hibernate validates the schema. Use the existing database backup/staging workflow; do not execute migrations manually in a Flyway-managed database. The frontend checks `promisedPaymentDates` from `/sales/recording-support` or `/loans/recording-support` before sending a promised date to prevent silent loss against an older backend.

New loans and historical loans without a promised date remain undated until staff set one. Existing sale request hashes without promised dates retain their original format, preserving safe retries across updates.

Endpoints (existing authentication required):

- `GET /loans/recording-support`: promised-date capability.
- `PUT /loans/{id}/due-date`: `{dueDate}` as `YYYY-MM-DD`; null clears it.
- Sale and Other-loan creation accept optional `dueDate`; loan responses include `dueDate`.

## Validation

Run `pnpm test:utang`, `pnpm test:stock`, `pnpm test:branding`, and `pnpm build`. Run Java 21 backend tests with `mvn -f backend/pom.xml test`.

For database tests, enable `RUN_DATABASE_TESTS=true` with `DB_URL`, `DB_USER`, and `DB_PASSWORD` pointing at a disposable PostgreSQL database and run `mvn -f backend/pom.xml verify`. Coverage includes migration validation, dates, retries, loan balances, historical-limit removal, and RLS. Never run these tests on production.

## Verification performed

The frontend production build, all 21 frontend checks, and all 45 backend checks passed, including database integration tests against disposable PostgreSQL. Regression coverage verifies that a historical zero limit cannot block new Other loans or Utang sales. Browser checks confirmed that credit controls and requests are gone while dates, filters, and forms remain available. The local database applied V17 with its two loans, three payments, and all monetary totals unchanged.
