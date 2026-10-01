-- Add payment method and downpayment to sales
ALTER TABLE sales ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH';
ALTER TABLE sales ADD COLUMN downpayment NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Create loans table
CREATE TABLE loans (
    id                  BIGSERIAL PRIMARY KEY,
    category            VARCHAR(20) NOT NULL CHECK (category IN ('LPG', 'OTHER')),
    borrower_name       VARCHAR(255) NOT NULL,
    loan_date           DATE NOT NULL,
    description         VARCHAR(500),
    items_purchased     VARCHAR(500),
    total_amount        NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    amount_paid         NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    remaining_balance   NUMERIC(12, 2) NOT NULL CHECK (remaining_balance >= 0),
    status              VARCHAR(20) NOT NULL CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
    notes               TEXT,
    sale_id             BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loans_category ON loans (category);
CREATE INDEX idx_loans_status ON loans (status);
CREATE INDEX idx_loans_sale_id ON loans (sale_id);

-- Create loan payments history table
CREATE TABLE loan_payments (
    id              BIGSERIAL PRIMARY KEY,
    loan_id         BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date    DATE NOT NULL,
    notes           VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_payments_loan_id ON loan_payments (loan_id);
