-- Migración 008: Corregir tipo de retorno en get_category_expenses
-- WINM - What I Need Most
-- Corrige el error de tipo VARCHAR vs TEXT en la función get_category_expenses

-- ============================================
-- CORRECCIÓN: Tipo de retorno en get_category_expenses
-- ============================================
-- La función retorna VARCHAR(100) pero se espera TEXT
-- Solución: Hacer CAST explícito a TEXT

CREATE OR REPLACE FUNCTION get_category_expenses(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    total_amount DECIMAL(10, 2),
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS category_id,
        c.name::TEXT AS category_name,  -- CAST explícito a TEXT
        COALESCE(ABS(SUM(t.amount)), 0) AS total_amount,
        COUNT(*) AS transaction_count
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id
        AND t.user_id = p_user_id
        AND t.date::DATE >= p_start_date
        AND t.date::DATE <= p_end_date
        AND t.amount < 0 -- Solo gastos
    WHERE (c.is_system = TRUE OR c.user_id = p_user_id)
    GROUP BY c.id, c.name
    HAVING COUNT(t.id) > 0 OR c.is_system = TRUE
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_category_expenses IS 'Obtiene estadísticas de gastos por categoría en un período. Corregido tipo de retorno VARCHAR->TEXT';
