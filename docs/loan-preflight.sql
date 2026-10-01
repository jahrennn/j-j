-- Read-only checks to run before V8. Every query should return no invalid rows.
SELECT id, payment_method, downpayment, total_amount
FROM sales
WHERE payment_method NOT IN ('CASH', 'UTANG')
   OR downpayment < 0 OR downpayment > total_amount
   OR (payment_method = 'CASH' AND downpayment <> 0);

SELECT id, total_amount, amount_paid, remaining_balance, status
FROM loans
WHERE total_amount <= 0 OR amount_paid < 0 OR amount_paid > total_amount
   OR remaining_balance <> total_amount - amount_paid
   OR NOT (
       (status = 'UNPAID' AND amount_paid = 0 AND remaining_balance > 0)
       OR (status = 'PARTIALLY_PAID' AND amount_paid > 0 AND remaining_balance > 0)
       OR (status = 'PAID' AND remaining_balance = 0)
   );

SELECT sale_id, COUNT(*) FROM loans
WHERE sale_id IS NOT NULL GROUP BY sale_id HAVING COUNT(*) > 1;

SELECT id, category, sale_id FROM loans
WHERE (category = 'LPG' AND sale_id IS NULL)
   OR (category = 'OTHER' AND sale_id IS NOT NULL);

-- Audit-only reconciliation: V8 doesn't repair differences automatically.
SELECT l.id, l.amount_paid, COALESCE(SUM(p.amount), 0) AS logged_payments
FROM loans l LEFT JOIN loan_payments p ON p.loan_id = l.id
GROUP BY l.id, l.amount_paid
HAVING l.amount_paid <> COALESCE(SUM(p.amount), 0);
