-- Migración 005: Correcciones y validaciones adicionales
-- WINM - What I Need Most
-- Corrige problemas identificados en la revisión de esquemas

-- ============================================
-- 1. CORREGIR TABLA BUDGETS
-- ============================================

-- Agregar validación de que period_start <= period_end
ALTER TABLE budgets
    DROP CONSTRAINT IF EXISTS check_period_valid;

ALTER TABLE budgets
    ADD CONSTRAINT check_period_valid 
    CHECK (period_start <= period_end);

COMMENT ON CONSTRAINT check_period_valid ON budgets IS 'Valida que la fecha de inicio sea menor o igual a la fecha de fin';

-- ============================================
-- 2. CORREGIR TABLA CATEGORIES
-- ============================================

-- UNIQUE constraint ya creado en migración 003, solo agregar comentario si no existe
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

COMMENT ON CONSTRAINT unique_category_name_per_user ON categories IS 'Evita categorías duplicadas por usuario (NULL para sistema)';

-- Función para validar formato de color hex
CREATE OR REPLACE FUNCTION validate_hex_color(color_value VARCHAR(7))
RETURNS BOOLEAN AS $$
BEGIN
    -- Validar formato: #RRGGBB (6 dígitos hex después de #)
    RETURN color_value ~ '^#[0-9A-Fa-f]{6}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Agregar CHECK constraint para validar formato de color (solo si no es NULL)
ALTER TABLE categories
    DROP CONSTRAINT IF EXISTS check_color_format;

ALTER TABLE categories
    ADD CONSTRAINT check_color_format 
    CHECK (color IS NULL OR validate_hex_color(color));

COMMENT ON CONSTRAINT check_color_format ON categories IS 'Valida que el color esté en formato hex (#RRGGBB)';

-- ============================================
-- 3. CORREGIR TABLA CATEGORIZATION_RULES
-- ============================================

-- Validar que priority >= 0
ALTER TABLE categorization_rules
    DROP CONSTRAINT IF EXISTS check_priority_positive;

ALTER TABLE categorization_rules
    ADD CONSTRAINT check_priority_positive 
    CHECK (priority >= 0);

COMMENT ON CONSTRAINT check_priority_positive ON categorization_rules IS 'Valida que la prioridad sea un número positivo';

-- Función para validar regex patterns (solo para tipo 'regex')
CREATE OR REPLACE FUNCTION validate_regex_pattern(pattern_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Intentar compilar el regex, si falla retorna FALSE
    BEGIN
        PERFORM '' ~ pattern_value;
        RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Nota: No podemos agregar CHECK constraint para validar regex en tiempo de creación
-- porque PostgreSQL no permite funciones no-deterministas en CHECK constraints.
-- La validación se hará en la aplicación o mediante trigger.

-- ============================================
-- 4. CORREGIR TABLA BUDGET_ALERTS
-- ============================================

-- Validar que percentage_used esté entre 0-100
ALTER TABLE budget_alerts
    DROP CONSTRAINT IF EXISTS check_percentage_range;

ALTER TABLE budget_alerts
    ADD CONSTRAINT check_percentage_range 
    CHECK (percentage_used >= 0 AND percentage_used <= 100);

COMMENT ON CONSTRAINT check_percentage_range ON budget_alerts IS 'Valida que el porcentaje usado esté entre 0 y 100';

-- Nota: No validamos que current_spent <= budget_amount porque puede excederse
-- (ese es el propósito de las alertas de "exceeded")

-- ============================================
-- 5. CORREGIR TABLA TRANSACTIONS
-- ============================================

-- Validar que amount no sea 0 (opcional, pero recomendado)
ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS check_amount_not_zero;

ALTER TABLE transactions
    ADD CONSTRAINT check_amount_not_zero 
    CHECK (amount != 0);

COMMENT ON CONSTRAINT check_amount_not_zero ON transactions IS 'Valida que el monto de la transacción no sea cero';

-- ============================================
-- 6. OPTIMIZAR ÍNDICES PARA MEJOR PERFORMANCE
-- ============================================

-- Índice compuesto para get_budget_spent() - mejora performance significativamente
-- Nota: Usamos date directamente, PostgreSQL maneja la comparación con DATE automáticamente
CREATE INDEX IF NOT EXISTS idx_transactions_budget_lookup 
ON transactions(user_id, category_id, date) 
WHERE amount < 0;

COMMENT ON INDEX idx_transactions_budget_lookup IS 'Índice optimizado para consultas de presupuestos por categoría y fecha';

-- Índice compuesto para consultas frecuentes de transacciones por usuario y categoría
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date 
ON transactions(user_id, category_id, date DESC) 
WHERE category_id IS NOT NULL;

COMMENT ON INDEX idx_transactions_user_category_date IS 'Índice para consultas de transacciones por usuario, categoría y fecha';

-- ============================================
-- 7. MEJORAR FUNCIÓN get_budget_spent CON MEJOR PERFORMANCE
-- ============================================

-- La función actual ya está optimizada, pero podemos agregar un comentario
COMMENT ON FUNCTION get_budget_spent IS 'Calcula el gasto total en una categoría para un período específico. Usa índice idx_transactions_budget_lookup para mejor performance';

-- ============================================
-- 8. TRIGGER PARA VALIDAR REGEX PATTERNS EN REGLAS
-- ============================================

CREATE OR REPLACE FUNCTION validate_regex_rule()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo validar si el tipo de regla es 'regex'
    IF NEW.rule_type = 'regex' THEN
        BEGIN
            -- Intentar compilar el regex
            PERFORM '' ~ NEW.pattern;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid regex pattern: %', NEW.pattern;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar regex antes de insertar/actualizar
DROP TRIGGER IF EXISTS trigger_validate_regex_rule ON categorization_rules;

CREATE TRIGGER trigger_validate_regex_rule
    BEFORE INSERT OR UPDATE ON categorization_rules
    FOR EACH ROW
    WHEN (NEW.rule_type = 'regex')
    EXECUTE FUNCTION validate_regex_rule();

COMMENT ON FUNCTION validate_regex_rule IS 'Valida que los patrones regex sean válidos antes de insertar/actualizar reglas';

-- ============================================
-- 9. FUNCIÓN HELPER PARA VALIDAR PERÍODOS DE PRESUPUESTO
-- ============================================

CREATE OR REPLACE FUNCTION validate_budget_period(
    p_period_type VARCHAR(20),
    p_period_start DATE,
    p_period_end DATE
) RETURNS BOOLEAN AS $$
DECLARE
    v_days_diff INTEGER;
BEGIN
    -- Calcular diferencia en días
    v_days_diff := p_period_end - p_period_start;
    
    -- Validar según el tipo de período
    CASE p_period_type
        WHEN 'semanal' THEN
            RETURN v_days_diff >= 0 AND v_days_diff <= 7;
        WHEN 'mensual' THEN
            RETURN v_days_diff >= 0 AND v_days_diff <= 31;
        WHEN 'anual' THEN
            RETURN v_days_diff >= 0 AND v_days_diff <= 366;
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_budget_period IS 'Valida que el período del presupuesto coincida con su tipo (semanal, mensual, anual)';

-- Nota: No agregamos CHECK constraint porque requiere función no-determinista
-- La validación se puede hacer en la aplicación o mediante trigger si es necesario

-- ============================================
-- RESUMEN DE CAMBIOS
-- ============================================

-- Constraints agregados:
-- ✅ check_period_valid en budgets
-- ✅ unique_category_name_per_user en categories
-- ✅ check_color_format en categories
-- ✅ check_priority_positive en categorization_rules
-- ✅ check_percentage_range en budget_alerts
-- ✅ check_amount_not_zero en transactions

-- Índices optimizados:
-- ✅ idx_transactions_budget_lookup (compuesto para mejor performance)
-- ✅ idx_transactions_user_category_date (compuesto para consultas frecuentes)

-- Triggers agregados:
-- ✅ trigger_validate_regex_rule (valida regex patterns)

-- Funciones agregadas:
-- ✅ validate_hex_color (valida formato de color)
-- ✅ validate_regex_pattern (valida regex patterns)
-- ✅ validate_budget_period (valida períodos de presupuesto)
