-- Migración 004: Funciones para auto-categorización y alertas automáticas
-- WINM - What I Need Most

-- ============================================
-- FUNCIÓN: Auto-categorizar transacción
-- ============================================
-- Aplica las reglas de categorización a una descripción y retorna la categoría sugerida
CREATE OR REPLACE FUNCTION auto_categorize_transaction(
    p_user_id UUID,
    p_description TEXT
) RETURNS UUID AS $$
DECLARE
    v_category_id UUID;
    v_rule categorization_rules%ROWTYPE;
BEGIN
    -- Buscar reglas activas del usuario ordenadas por prioridad
    FOR v_rule IN 
        SELECT * FROM categorization_rules
        WHERE user_id = p_user_id
          AND is_active = TRUE
        ORDER BY priority ASC, created_at ASC
    LOOP
        -- Aplicar regla según su tipo
        CASE v_rule.rule_type
            WHEN 'contains' THEN
                IF (v_rule.is_case_sensitive AND p_description LIKE '%' || v_rule.pattern || '%')
                   OR (NOT v_rule.is_case_sensitive AND LOWER(p_description) LIKE '%' || LOWER(v_rule.pattern) || '%') THEN
                    -- Incrementar contador de coincidencias
                    UPDATE categorization_rules 
                    SET match_count = match_count + 1, updated_at = NOW()
                    WHERE id = v_rule.id;
                    
                    RETURN v_rule.category_id;
                END IF;
                
            WHEN 'starts_with' THEN
                IF (v_rule.is_case_sensitive AND p_description LIKE v_rule.pattern || '%')
                   OR (NOT v_rule.is_case_sensitive AND LOWER(p_description) LIKE LOWER(v_rule.pattern) || '%') THEN
                    UPDATE categorization_rules 
                    SET match_count = match_count + 1, updated_at = NOW()
                    WHERE id = v_rule.id;
                    
                    RETURN v_rule.category_id;
                END IF;
                
            WHEN 'ends_with' THEN
                IF (v_rule.is_case_sensitive AND p_description LIKE '%' || v_rule.pattern)
                   OR (NOT v_rule.is_case_sensitive AND LOWER(p_description) LIKE '%' || LOWER(v_rule.pattern)) THEN
                    UPDATE categorization_rules 
                    SET match_count = match_count + 1, updated_at = NOW()
                    WHERE id = v_rule.id;
                    
                    RETURN v_rule.category_id;
                END IF;
                
            WHEN 'exact_match' THEN
                IF (v_rule.is_case_sensitive AND p_description = v_rule.pattern)
                   OR (NOT v_rule.is_case_sensitive AND LOWER(p_description) = LOWER(v_rule.pattern)) THEN
                    UPDATE categorization_rules 
                    SET match_count = match_count + 1, updated_at = NOW()
                    WHERE id = v_rule.id;
                    
                    RETURN v_rule.category_id;
                END IF;
                
            WHEN 'regex' THEN
                -- PostgreSQL regex matching
                IF p_description ~* v_rule.pattern THEN
                    UPDATE categorization_rules 
                    SET match_count = match_count + 1, updated_at = NOW()
                    WHERE id = v_rule.id;
                    
                    RETURN v_rule.category_id;
                END IF;
        END CASE;
    END LOOP;
    
    -- Si no hay coincidencias, retornar NULL
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_categorize_transaction IS 'Aplica reglas de categorización a una descripción y retorna category_id sugerido';

-- ============================================
-- FUNCIÓN: Verificar y crear alertas de presupuesto
-- ============================================
-- Verifica si una transacción nueva debe generar una alerta de presupuesto
CREATE OR REPLACE FUNCTION check_budget_alerts(
    p_user_id UUID,
    p_category_id UUID,
    p_amount DECIMAL(10, 2),
    p_transaction_date TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
DECLARE
    v_budget budgets%ROWTYPE;
    v_current_spent DECIMAL(10, 2);
    v_percentage DECIMAL(5, 2);
    v_alert_type VARCHAR(20);
BEGIN
    -- Solo procesar si es un gasto (monto negativo) y tiene categoría
    IF p_amount >= 0 OR p_category_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Buscar presupuestos activos para esta categoría que incluyan la fecha de la transacción
    FOR v_budget IN
        SELECT * FROM budgets
        WHERE user_id = p_user_id
          AND category_id = p_category_id
          AND is_active = TRUE
          AND p_transaction_date::DATE >= period_start
          AND p_transaction_date::DATE <= period_end
    LOOP
        -- Calcular gasto actual
        v_current_spent := get_budget_spent(
            p_user_id,
            p_category_id,
            v_budget.period_start,
            v_budget.period_end
        );
        
        -- Calcular porcentaje usado
        v_percentage := ROUND((v_current_spent / v_budget.amount * 100)::NUMERIC, 2);
        
        -- Determinar tipo de alerta
        IF v_current_spent >= v_budget.amount THEN
            v_alert_type := 'exceeded';
        ELSIF v_percentage >= v_budget.alert_threshold THEN
            v_alert_type := 'threshold';
        ELSE
            CONTINUE; -- No generar alerta si no alcanza el threshold
        END IF;
        
        -- Verificar si ya existe una alerta reciente (últimas 24 horas) para evitar spam
        IF NOT EXISTS (
            SELECT 1 FROM budget_alerts
            WHERE user_id = p_user_id
              AND budget_id = v_budget.id
              AND alert_type = v_alert_type
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            -- Crear alerta
            INSERT INTO budget_alerts (
                user_id,
                budget_id,
                current_spent,
                budget_amount,
                percentage_used,
                alert_type
            ) VALUES (
                p_user_id,
                v_budget.id,
                v_current_spent,
                v_budget.amount,
                v_percentage,
                v_alert_type
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_budget_alerts IS 'Verifica presupuestos y crea alertas si se alcanza o excede el threshold';

-- ============================================
-- TRIGGER: Auto-categorizar y verificar alertas al insertar transacción
-- ============================================
CREATE OR REPLACE FUNCTION trigger_auto_categorize_and_check_alerts()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id UUID;
BEGIN
    -- Solo procesar si no tiene categoría asignada
    IF NEW.category_id IS NULL AND NEW.description IS NOT NULL THEN
        -- Intentar auto-categorizar
        v_category_id := auto_categorize_transaction(NEW.user_id, NEW.description);
        
        IF v_category_id IS NOT NULL THEN
            NEW.category_id := v_category_id;
            -- También actualizar el campo category (text) para compatibilidad
            NEW.category := COALESCE(
                (SELECT name FROM categories WHERE id = v_category_id),
                NEW.category
            );
        END IF;
    END IF;
    
    -- Verificar alertas de presupuesto después de insertar
    -- Nota: Esto se ejecutará después del INSERT mediante otro trigger
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_before_insert_transaction
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_categorize_and_check_alerts();

-- Trigger para verificar alertas después de insertar
CREATE OR REPLACE FUNCTION trigger_after_insert_check_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar alertas de presupuesto
    IF NEW.category_id IS NOT NULL AND NEW.amount < 0 THEN
        PERFORM check_budget_alerts(
            NEW.user_id,
            NEW.category_id,
            NEW.amount,
            NEW.date
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_insert_transaction
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_after_insert_check_alerts();

COMMENT ON FUNCTION trigger_auto_categorize_and_check_alerts IS 'Auto-categoriza transacciones antes de insertar';
COMMENT ON FUNCTION trigger_after_insert_check_alerts IS 'Verifica alertas de presupuesto después de insertar transacción';

-- ============================================
-- FUNCIÓN: Obtener estadísticas de gastos por categoría
-- ============================================
-- Útil para el dashboard
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
        c.name AS category_name,
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

COMMENT ON FUNCTION get_category_expenses IS 'Obtiene estadísticas de gastos por categoría en un período';
