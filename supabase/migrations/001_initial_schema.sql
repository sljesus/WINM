-- Migración inicial: Crear tabla de transacciones
-- WINM - What I Need Most

-- Crear tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    category TEXT,
    bank TEXT NOT NULL, -- Mantenido por compatibilidad
    source VARCHAR(50) NOT NULL DEFAULT 'BBVA' CHECK (source IN ('Mercado Pago', 'NU', 'Plata Card', 'BBVA')),
    transaction_type VARCHAR(20) DEFAULT 'compra' CHECK (transaction_type IN ('compra', 'ingreso', 'transferencia', 'retiro', 'otro')),
    email_id VARCHAR(255), -- ID del email de Gmail para evitar duplicados
    email_subject TEXT, -- Asunto del email para debugging
    needs_categorization BOOLEAN DEFAULT FALSE, -- TRUE si requiere que el usuario indique en qué se gastó
    expense_detail TEXT, -- Detalle de en qué se gastó el dinero (para retiros y pagos en efectivo)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Crear índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_processed_at ON transactions(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_needs_categorization ON transactions(needs_categorization) WHERE needs_categorization = TRUE;

-- Índice único para evitar duplicados por email
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_email_unique 
ON transactions(user_id, email_id) 
WHERE email_id IS NOT NULL;

-- Habilitar Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias transacciones
CREATE POLICY "Users can view their own transactions"
    ON transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propias transacciones
CREATE POLICY "Users can insert their own transactions"
    ON transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propias transacciones
CREATE POLICY "Users can update their own transactions"
    ON transactions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propias transacciones
CREATE POLICY "Users can delete their own transactions"
    ON transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE transactions IS 'Tabla principal de transacciones financieras del usuario';
COMMENT ON COLUMN transactions.amount IS 'Monto de la transacción (positivo para ingresos, negativo para compras)';
COMMENT ON COLUMN transactions.description IS 'Descripción o concepto de la transacción';
COMMENT ON COLUMN transactions.date IS 'Fecha y hora de la transacción';
COMMENT ON COLUMN transactions.category IS 'Categoría de la transacción (opcional)';
COMMENT ON COLUMN transactions.bank IS 'Banco origen (mantenido por compatibilidad, usar source)';
COMMENT ON COLUMN transactions.source IS 'Fuente de la transacción: Mercado Pago, NU, Plata Card, BBVA';
COMMENT ON COLUMN transactions.transaction_type IS 'Tipo: compra, ingreso, transferencia, retiro, otro';
COMMENT ON COLUMN transactions.email_id IS 'ID del email de Gmail para evitar duplicados';
COMMENT ON COLUMN transactions.email_subject IS 'Asunto del email para debugging';
COMMENT ON COLUMN transactions.needs_categorization IS 'TRUE si requiere que el usuario indique en qué se gastó (retiros, pagos en efectivo)';
COMMENT ON COLUMN transactions.expense_detail IS 'Detalle de en qué se gastó el dinero del retiro o pago en efectivo';
COMMENT ON COLUMN transactions.processed_at IS 'Fecha en que se procesó el email';
COMMENT ON COLUMN transactions.user_id IS 'ID del usuario propietario de la transacción';
