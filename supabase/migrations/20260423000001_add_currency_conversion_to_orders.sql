-- Add currency conversion columns to orders table
-- This allows us to store both the original USD amount and the charged GHS amount

ALTER TABLE orders 
ADD COLUMN amount_usd DECIMAL(10,2),
ADD COLUMN amount_ghs DECIMAL(10,2),
ADD COLUMN exchange_rate DECIMAL(10,4),
ADD COLUMN original_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN charged_currency VARCHAR(3) DEFAULT 'GHS';

-- Add comments to explain the new columns
COMMENT ON COLUMN orders.amount_usd IS 'Original amount in USD (source of truth)';
COMMENT ON COLUMN orders.amount_ghs IS 'Amount charged in GHS (actual payment)';
COMMENT ON COLUMN orders.exchange_rate IS 'Exchange rate used for USD to GHS conversion';
COMMENT ON COLUMN orders.original_currency IS 'Original currency of the course price';
COMMENT ON COLUMN orders.charged_currency IS 'Currency actually charged to customer';

-- Create an index on the new currency columns for better query performance
CREATE INDEX idx_orders_currency_conversion ON orders(amount_usd, amount_ghs, exchange_rate);
