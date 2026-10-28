-- Credit limits have been removed from the application. Future loans no longer
-- create or require a credit account. Retain historical references and account
-- data for recovery; balances, payment history, and promised dates are unchanged.
ALTER TABLE public.loans ALTER COLUMN customer_id DROP NOT NULL;
