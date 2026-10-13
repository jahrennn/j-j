# Sales and stock reliability

## Findings and changes

Recording a sale already deducted stock and saved the sale, stock movement, and optional LPG loan/exchange in one PostgreSQL transaction. The sold product is locked, preventing concurrent sales from overwriting each other's stock deductions. A failed sale rolls back all those writes.

The Inventory and Dashboard pages previously fetched stock only when mounted. A screen left open while another tab or device recorded a sale could keep showing an old count. The sales product dropdown also loaded on mount and silently logged refresh failures. A read-only production audit found matching deductions for all seven SK 2.7kg sales on October 11–12, 2026 (Philippine time), ending at 116. Stale screen data remains the likely explanation; the specific browser incident has not been reproduced.

The updated screens:

- Refresh stock in Inventory, Sales, and Dashboard when returning to the visible app and every 30 seconds while visible. Inventory has a manual Refresh button. This is periodic refresh, not an instant live subscription. Dashboard stock refreshes independently of analytics and warns when its stock refresh fails.
- Fetch stock again when opening Record Sale, report refresh failures, and prevent recording a new sale against a failed stock fetch.
- Keep refreshing while Record Sale is open. Background reads preserve the selected product and editable buyer/quantity fields. A separate available-stock label and a Refresh Stock button make the latest count visible outside the native dropdown. Reads started before submission are invalidated, and stock is fetched again after both successful and failed attempts.
- Ignore older inventory responses arriving after newer requests.
- Show SKUs in the sales product dropdown so similar product names can be distinguished.
- Show a successful sale's transaction ID, product, quantity, and backend-confirmed remaining stock. The Inventory page includes the matching stock movement, such as `94 → 93`.
- Keep a pending sale request in the tab's session storage across page reloads and route changes. After a network failure, Confirm Pending Sale / Retry Same Sale sends the same immutable request instead of creating another sale. Closing the tab or clearing site data removes that local retry information; check Sales before manually re-entering an uncertain transaction.
- Preserve the pending request ID when a retry is rejected, including HTTP 400, 403, 404, 409, or 429. A rejected retry cannot prove that an earlier attempt did not save. Only an initial HTTP 400 validation rejection clears the request for editing; successful confirmation clears it normally.

The retry-handling and Dashboard follow-up fixes are frontend-only and require no additional database migration. They do not recalculate historical stock or modify saved business records. The already-existing V15 migration below belongs to the earlier backend retry-protection changes and remains unchanged.

## October 13 production trace

A read-only database check at approximately 8:58 PM Philippine time found SK-2.7 stock at 110. The two sales that day had exactly one matching deduction each: 116 → 114 at 6:07 PM and 114 → 110 at 6:09 PM. All current product balances matched their latest movement. V15 was installed, but both SK sales lacked a request-ledger entry.

The public frontend at `https://j-j-zeta.vercel.app/login` served `/assets/index-BVz9lEZj.js`, with an HTML Last-Modified timestamp of October 12 at 12:13 PM Philippine time. That JavaScript lacked the stock-refresh listeners, request IDs, recording-support check, and confirmation messages already present in commit `0101b83`. This establishes that the production frontend was still old; it does not establish why Vercel had not published the newer commit.

The newer source also skipped stock refresh whenever Record Sale was open. A failing regression reproduced the dropdown remaining at 116 after another simulated device reduced stock to 114. That guard is now removed, with non-blocking background refresh and a separate stock label.

`vercel.json` now explicitly selects Vite, `pnpm build`, and `dist`, so a source deployment rebuilds the frontend. Deploy the latest source to the production project, with `VITE_API_BASE_URL=https://jjlpg-backend.onrender.com/api`. Rebuild rather than uploading the existing checked-in `dist`, which was compiled for localhost. No backend deployment or database migration is needed for this follow-up.

After deployment, run `pnpm check:live-stock` to read only public HTML/JavaScript and verify the expected fixes are present at the production URL. This check fails against the old live bundle. Then reload existing app tabs/devices. An already-open page continues running its loaded JavaScript until it is reloaded.

Two additional issues were found:

1. Retrying a sale after a lost response could save a second sale. New clients send a UUID request ID, and the backend atomically claims it in `sale_requests`. Identical retries return the original sale without deducting stock or creating another loan/exchange. Changed details return 409. A deleted sale's request ID remains reserved so a late retry cannot recreate it. Older clients without request IDs remain compatible but do not receive this retry protection; reload open tabs after deployment.
2. Concurrent requests to delete one cash sale could restore its stock twice. Deletion now locks the sale before restoring stock, so only one request can restore it. Loan/exchange-linked sales remain protected against deletion.

## Automatic deployment

Push all changed files, including `V15__sale_request_deduplication.sql`. Render applies V15 through Flyway at startup. It only creates a protected request ledger and index; it does not rewrite existing sales, prices, capital, inventory quantities, or stock history. Historical sales are not backfilled or deducted again.

The new frontend checks `/api/sales/recording-support` before sending a sale with a request ID. If Vercel finishes before Render, recording waits/fails visibly until the new backend is available, rather than silently using an older backend that ignores request IDs. Existing screens should be refreshed after both deployments succeed.

Use the existing production datasource, `ddl-auto=validate`, and a backup before deploying. Do not drop tables, modify old migrations, or run database tests against production. If production is older than V14, review its other pending migrations as well.

A populated disposable V14 database was upgraded to V15. Before/after data dumps of all existing application tables and their sequences matched. Frontend production and backend Java 21 Docker builds passed.

## If a production count still looks wrong

Do not record another sale or manually subtract stock just to test whether the first one saved. First:

1. Find the sale by buyer/date/transaction ID in Sales.
2. Refresh Inventory, confirm the correct product/SKU, and filter Stock Movement History for that product.
3. Look for the same transaction ID with type Sale and the expected before/after quantities.
4. Check for later Restock, Correction, Damage, or Sale Reversal entries that explain the current count.

The read-only queries in `sales-stock-audit.sql` can help compare the database directly. They do not repair or delete any data. Any production correction should be based on the physical stock count and transaction history, with a recorded reason; never automatically subtract all historical sales from the current count.

## Verification

The frontend follow-up was checked with `pnpm test:stock`, TypeScript, and a production-mode build written to a temporary directory. The regression checks execute the actual Sales and Dashboard components with in-memory APIs, storage, hooks, and timers. They cover lost responses followed by rejected retries across reloads, initial validation failures, rate limits, focus/timer refresh, refresh failure recovery, stale responses arriving late, and an open sale dropdown changing after sales/restocks on another device. No live API, database, migration, or backend database test is used by these checks. CI runs them before building the frontend.

A real browser connected only to an isolated localhost in-memory API also verified that the open sale form changed from 116 to 114 on automatic refresh without losing its buyer name or product selection. A simulated sale then displayed confirmed stock of 113, and reopening Record Sale showed 113 in both the dropdown and available-stock label. These checks do not verify an authenticated production browser session.

Earlier verification of the existing backend changes:

The PostgreSQL suite covers cash/credit sales, pickup/delivery, tank exchanges, multiple quantities, rollback after validation failure, insufficient stock, simultaneous sales of the last tank, simultaneous retries, changed retry details, saved price snapshots, concurrent deletion, deleted-sale retries, and stale product edits. The 94-stock regression asserts the product row, Inventory API result, sale response, and stock movement all agree on 93 after one sale. All 40 backend tests passed against disposable PostgreSQL with Supabase-like roles.

Real HTTP and browser checks verified the same 94-to-93 flow, matching stock history, automatic refresh after another simulated device's sale, and safe retry after deliberately dropping a successful sale's HTTP response. The retry was performed after reloading the browser and returned the same transaction with one deduction. These checks do not verify the live Render build, live database, or the mother's specific transaction.
