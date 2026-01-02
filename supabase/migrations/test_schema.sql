-- Script de Prueba para Validar Esquema WINM
-- Ejecutar DESPUÉS de ejecutar todas las migraciones (001-005)
-- Este script valida que todo funcione correctamente

-- ============================================
-- PRUEBA 1: Verificar que las tablas existen
-- ============================================
DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts');
    
    IF v_table_count != 5 THEN
        RAISE EXCEPTION 'Faltan tablas. Esperadas: 5, Encontradas: %', v_table_count;
    ELSE
        RAISE NOTICE '✅ Todas las tablas existen correctamente';
    END IF;
END $$;

-- ============================================
-- PRUEBA 2: Verificar categorías del sistema
-- ============================================
DO $$
DECLARE
    v_category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_category_count
    FROM categories
    WHERE is_system = TRUE;
    
    IF v_category_count != 15 THEN
        RAISE EXCEPTION 'Categorías del sistema incorrectas. Esperadas: 15, Encontradas: %', v_category_count;
    ELSE
        RAISE NOTICE '✅ Categorías del sistema correctas: %', v_category_count;
    END IF;
END $$;

-- ============================================
-- PRUEBA 3: Verificar RLS habilitado
-- ============================================
DO $$
DECLARE
    v_rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts')
      AND rowsecurity = TRUE;
    
    IF v_rls_count != 5 THEN
        RAISE EXCEPTION 'RLS no habilitado en todas las tablas. Esperadas: 5, Encontradas: %', v_rls_count;
    ELSE
        RAISE NOTICE '✅ RLS habilitado en todas las tablas';
    END IF;
END $$;

-- ============================================
-- PRUEBA 4: Verificar funciones existen
-- ============================================
DO $$
DECLARE
    v_function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'get_budget_spent',
          'auto_categorize_transaction',
          'check_budget_alerts',
          'get_category_expenses',
          'update_budgets_updated_at',
          'validate_hex_color',
          'validate_regex_pattern',
          'validate_regex_rule',
          'validate_budget_period'
      );
    
    IF v_function_count < 9 THEN
        RAISE EXCEPTION 'Faltan funciones. Esperadas: 9, Encontradas: %', v_function_count;
    ELSE
        RAISE NOTICE '✅ Funciones principales existen: %', v_function_count;
    END IF;
END $$;

-- ============================================
-- PRUEBA 5: Verificar triggers existen
-- ============================================
DO $$
DECLARE
    v_trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'transactions'
      AND t.tgname IN (
          'trigger_before_insert_transaction',
          'trigger_after_insert_transaction'
      );
    
    IF v_trigger_count != 2 THEN
        RAISE EXCEPTION 'Faltan triggers en transactions. Esperados: 2, Encontrados: %', v_trigger_count;
    ELSE
        RAISE NOTICE '✅ Triggers de transactions existen';
    END IF;
END $$;

-- ============================================
-- PRUEBA 6: Verificar índices críticos
-- ============================================
DO $$
DECLARE
    v_index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
          'idx_transactions_email_unique',
          'idx_transactions_budget_lookup',
          'idx_budgets_active',
          'idx_alerts_unread'
      );
    
    IF v_index_count < 4 THEN
        RAISE EXCEPTION 'Faltan índices críticos. Esperados: 4, Encontrados: %', v_index_count;
    ELSE
        RAISE NOTICE '✅ Índices críticos existen: %', v_index_count;
    END IF;
END $$;

-- ============================================
-- PRUEBA 7: Verificar constraints importantes
-- ============================================
DO $$
DECLARE
    v_constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND constraint_name IN (
          'check_period_valid',
          'unique_category_name_per_user',
          'check_color_format',
          'check_priority_positive',
          'check_percentage_range',
          'check_amount_not_zero'
      );
    
    IF v_constraint_count < 6 THEN
        RAISE EXCEPTION 'Faltan constraints importantes. Esperados: 6, Encontrados: %', v_constraint_count;
    ELSE
        RAISE NOTICE '✅ Constraints importantes existen: %', v_constraint_count;
    END IF;
END $$;

-- ============================================
-- PRUEBA 8: Verificar vista budget_summary
-- ============================================
DO $$
DECLARE
    v_view_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
          AND table_name = 'budget_summary'
    ) INTO v_view_exists;
    
    IF NOT v_view_exists THEN
        RAISE EXCEPTION 'Vista budget_summary no existe';
    ELSE
        RAISE NOTICE '✅ Vista budget_summary existe';
    END IF;
END $$;

-- ============================================
-- RESUMEN FINAL
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ VALIDACIÓN COMPLETA DEL ESQUEMA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Todas las pruebas pasaron correctamente';
    RAISE NOTICE 'El esquema está listo para usar';
    RAISE NOTICE '========================================';
END $$;
