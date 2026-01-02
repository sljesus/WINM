-- Migración 002: Mejorar esquema para soportar múltiples fuentes
-- WINM - What I Need Most
-- Agrega campos para diferenciar fuentes y tipos de transacciones

-- Agregar nuevos campos a la tabla transactions
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'compra' CHECK (transaction_type IN ('compra', 'ingreso', 'transferencia', 'retiro', 'otro')),
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'BBVA' CHECK (source IN ('Mercado Pago', 'NU', 'Plata Card', 'BBVA')),
    ADD COLUMN IF NOT EXISTS email_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email_subject TEXT,
    ADD COLUMN IF NOT EXISTS needs_categorization BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS expense_detail TEXT,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrar datos existentes: bank -> source
UPDATE transactions 
SET source = bank 
WHERE source = 'BBVA' AND bank IS NOT NULL;

-- Crear índice único para evitar duplicados por email
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_email_unique 
ON transactions(user_id, email_id) 
WHERE email_id IS NOT NULL;

-- Crear índices adicionales para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_processed_at ON transactions(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_needs_categorization ON transactions(needs_categorization) WHERE needs_categorization = TRUE;

-- Comentarios actualizados
COMMENT ON COLUMN transactions.transaction_type IS 'Tipo de transacción: compra, ingreso, transferencia, retiro, otro';
COMMENT ON COLUMN transactions.source IS 'Fuente de la transacción: Mercado Pago, NU, Plata Card, BBVA';
COMMENT ON COLUMN transactions.email_id IS 'ID del email de Gmail para evitar duplicados';
COMMENT ON COLUMN transactions.email_subject IS 'Asunto del email para debugging';
COMMENT ON COLUMN transactions.needs_categorization IS 'TRUE si requiere que el usuario indique en qué se gastó (retiros, pagos en efectivo)';
COMMENT ON COLUMN transactions.expense_detail IS 'Detalle de en qué se gastó el dinero del retiro o pago en efectivo';
COMMENT ON COLUMN transactions.processed_at IS 'Fecha en que se procesó el email';

-- Nota: El campo 'bank' se mantiene por compatibilidad pero 'source' es el preferido
