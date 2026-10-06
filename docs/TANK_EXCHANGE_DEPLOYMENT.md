# Tank Exchange Register deployment

Flyway migration `V11__tank_exchanges.sql` creates a new table. It does not
change existing sales, products, stock quantities, loans, or stock movements.
Only exchanges recorded after this release appear in the register.

1. Back up the Supabase database and verify the backup can be restored.
2. Deploy the Spring Boot backend first. Flyway applies V10 (if not already
   deployed) and V11 automatically at startup. Do not run those scripts by hand
   if Flyway manages the database.
3. Confirm the backend starts successfully, then deploy the Vercel frontend.
4. In staging, make a test LPG Tank sale with **Customer is exchanging a tank**
   selected. Choose the tank the customer brought and the tank supplied. Check
   the Tank Exchange Register, sales report, and Inventory stock movement
   history. In production, verify the first genuine exchange using the same
   checks; exchange sales are retained for audit and cannot be deleted.

The supplied tank is the product sold and follows the normal sale stock
deduction. The customer tank is recorded for tracking only; it is not added
automatically to saleable inventory. Exchange rows retain the tank names and
SKUs at the time of sale, even if product details change later. A sale linked
to an exchange cannot be deleted because it would remove the audit context.
Only inventory products with "tank" in their names appear in exchange choices.
