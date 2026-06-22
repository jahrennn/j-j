-- Initial schema for Jahren and John LPG Trading

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    sku         VARCHAR(20) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('LPG_REFILL', 'LPG_TANK')),
    stock       INTEGER NOT NULL CHECK (stock >= 0),
    unit_price  NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales (
    id              BIGSERIAL PRIMARY KEY,
    sale_date       DATE NOT NULL,
    transaction_id  VARCHAR(50) NOT NULL UNIQUE,
    item_type       VARCHAR(20) NOT NULL CHECK (item_type IN ('LPG_REFILL', 'LPG_TANK')),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    total_amount    NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_sale_date ON sales (sale_date);

CREATE TABLE business_settings (
    id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    business_name   VARCHAR(255) NOT NULL,
    contact_number  VARCHAR(50) NOT NULL,
    address         VARCHAR(500) NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
