-- Migración 003: Agregar funcionalidades de presupuestos, categorías y auto-categorización
-- WINM - What I Need Most
-- Adapta las funcionalidades más solicitadas al esquema existente

-- ============================================
-- 1. TABLA DE CATEGORÍAS PREDEFINIDAS
-- ============================================
-- Permite tener categorías estándar y personalizadas por usuario
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50), -- Nombre de icono (ej: 'food', 'transport', 'shopping')
    color VARCHAR(7), -- Color en hex (ej: '#FF5733')
    is_system BOOLEAN DEFAULT FALSE, -- TRUE para categorías del sistema, FALSE para personalizadas
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: categorías del sistema no tienen user_id, las personalizadas sí
    CONSTRAINT check_system_category CHECK (
        (is_system = TRUE AND user_id IS NULL) OR 
        (is_system = FALSE AND user_id IS NOT NULL)
    )
);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_system ON categories(is_system);

-- UNIQUE constraint para evitar categorías duplicadas por usuario
-- Debe crearse antes del INSERT para que ON CONFLICT funcione
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_category_name_per_user'
    ) THEN
        ALTER TABLE categories
            ADD CONSTRAINT unique_category_name_per_user 
            UNIQUE (name, user_id);
    END IF;
END $$;

-- RLS para categorías
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system and own categories"
    ON categories FOR SELECT
    USING (is_system = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can update own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can delete own categories"
    ON categories FOR DELETE
    USING (auth.uid() = user_id AND is_system = FALSE);

-- Insertar categorías del sistema por defecto
INSERT INTO categories (name, icon, color, is_system) VALUES
    ('Alimentos y Bebidas', 'food', '#FF6B6B', TRUE),
    ('Transporte', 'car', '#4ECDC4', TRUE),
    ('Compras', 'shopping', '#45B7D1', TRUE),
    ('Entretenimiento', 'movie', '#FFA07A', TRUE),
    ('Servicios', 'home', '#98D8C8', TRUE),
    ('Salud', 'medical', '#F7DC6F', TRUE),
    ('Educación', 'book', '#BB8FCE', TRUE),
    ('Ropa', 'shirt', '#85C1E2', TRUE),
    ('Restaurantes', 'restaurant', '#F8B739', TRUE),
    ('Gasolina', 'gas', '#52BE80', TRUE),
    ('Supermercado', 'cart', '#5DADE2', TRUE),
    ('Servicios Públicos', 'light', '#F1948A', TRUE),
    ('Internet/Teléfono', 'wifi', '#AED6F1', TRUE),
    ('Seguros', 'shield', '#A569BD', TRUE),
    ('Otros', 'more', '#95A5A6', TRUE)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE categories IS 'Categorías predefinidas y personalizadas para transacciones';
COMMENT ON COLUMN categories.is_system IS 'TRUE para categorías del sistema disponibles para todos, FALSE para personalizadas del usuario';

-- ============================================
-- 2. TABLA DE PRESUPUESTOS
-- ============================================
-- Presupuestos por categoría y período (mensual, semanal, anual)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('mensual', 'semanal', 'anual')),
    period_start DATE NOT NULL, -- Inicio del período (ej: 2025-01-01 para enero)
    period_end DATE NOT NULL, -- Fin del período
    alert_threshold DECIMAL(5, 2) DEFAULT 80.00 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    -- alert_threshold: porcentaje de uso que activa alerta (ej: 80 = alerta al 80%)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un usuario no puede tener dos presupuestos activos para la misma categoría en el mismo período
    CONSTRAINT unique_active_budget_per_period UNIQUE (user_id, category_id, period_start, period_end, is_active)
);

-- Índices para presupuestos
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active) WHERE is_active = TRUE;

-- RLS para presupuestos
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
    ON budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
    ON budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
    ON budgets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
    ON budgets FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_budgets_updated_at();

COMMENT ON TABLE budgets IS 'Presupuestos por categoría y período para control de gastos';
COMMENT ON COLUMN budgets.alert_threshold IS 'Porcentaje de uso del presupuesto que activa alerta (0-100)';

-- ============================================
-- 3. TABLA DE REGLAS DE AUTO-CATEGORIZACIÓN
-- ============================================
-- Reglas para categorizar automáticamente transacciones basadas en patrones
CREATE TABLE IF NOT EXISTS categorization_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('contains', 'starts_with', 'ends_with', 'regex', 'exact_match')),
    pattern TEXT NOT NULL, -- Patrón a buscar en la descripción
    is_case_sensitive BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 100, -- Prioridad: menor número = mayor prioridad
    is_active BOOLEAN DEFAULT TRUE,
    match_count INTEGER DEFAULT 0, -- Contador de coincidencias (para estadísticas)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para reglas
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_category_id ON categorization_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_rules_active ON categorization_rules(is_active, priority) WHERE is_active = TRUE;

-- RLS para reglas
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules"
    ON categorization_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
    ON categorization_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
    ON categorization_rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
    ON categorization_rules FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_rules_updated_at
    BEFORE UPDATE ON categorization_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_budgets_updated_at();

COMMENT ON TABLE categorization_rules IS 'Reglas para auto-categorizar transacciones basadas en patrones en la descripción';
COMMENT ON COLUMN categorization_rules.priority IS 'Prioridad de la regla: menor número = mayor prioridad (se evalúan en orden)';

-- ============================================
-- 4. TABLA DE ALERTAS DE PRESUPUESTO
-- ============================================
-- Historial de alertas generadas cuando se alcanza el threshold del presupuesto
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
    current_spent DECIMAL(10, 2) NOT NULL,
    budget_amount DECIMAL(10, 2) NOT NULL,
    percentage_used DECIMAL(5, 2) NOT NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('threshold', 'exceeded', 'warning')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON budget_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_budget_id ON budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON budget_alerts(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON budget_alerts(created_at DESC);

-- RLS para alertas
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
    ON budget_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON budget_alerts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
    ON budget_alerts FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE budget_alerts IS 'Historial de alertas cuando se alcanza o excede el presupuesto';

-- ============================================
-- 5. ACTUALIZAR TABLA TRANSACTIONS
-- ============================================
-- Agregar foreign key a categories para mejor integridad
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Índice para category_id
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Función helper para obtener el gasto actual de un presupuesto
CREATE OR REPLACE FUNCTION get_budget_spent(
    p_user_id UUID,
    p_category_id UUID,
    p_period_start DATE,
    p_period_end DATE
) RETURNS DECIMAL(10, 2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT ABS(SUM(amount))
         FROM transactions
         WHERE user_id = p_user_id
           AND category_id = p_category_id
           AND date::DATE >= p_period_start
           AND date::DATE <= p_period_end
           AND amount < 0), -- Solo gastos (negativos)
        0
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_budget_spent IS 'Calcula el gasto total en una categoría para un período específico';

-- Vista útil: Presupuestos con gasto actual
CREATE OR REPLACE VIEW budget_summary AS
SELECT 
    b.id,
    b.user_id,
    b.category_id,
    c.name AS category_name,
    b.amount AS budget_amount,
    get_budget_spent(b.user_id, b.category_id, b.period_start, b.period_end) AS current_spent,
    ROUND(
        (get_budget_spent(b.user_id, b.category_id, b.period_start, b.period_end) / b.amount * 100)::NUMERIC,
        2
    ) AS percentage_used,
    b.period_type,
    b.period_start,
    b.period_end,
    b.alert_threshold,
    b.is_active,
    CASE 
        WHEN get_budget_spent(b.user_id, b.category_id, b.period_start, b.period_end) >= b.amount THEN 'exceeded'
        WHEN (get_budget_spent(b.user_id, b.category_id, b.period_start, b.period_end) / b.amount * 100) >= b.alert_threshold THEN 'threshold'
        ELSE 'ok'
    END AS status
FROM budgets b
JOIN categories c ON b.category_id = c.id
WHERE b.is_active = TRUE;

COMMENT ON VIEW budget_summary IS 'Vista que muestra presupuestos con su gasto actual y porcentaje usado';
