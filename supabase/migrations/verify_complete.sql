-- Script de Verificación Completa de Base de Datos
-- WINM - What I Need Most
-- Ejecuta todas las verificaciones SQL para validar pilares básicos

-- ============================================
-- 1. VERIFICAR TABLAS
-- ============================================
SELECT '=== TABLAS ===' AS verificacion;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts')
ORDER BY table_name;

-- ============================================
-- 2. VERIFICAR ROW LEVEL SECURITY (RLS)
-- ============================================
SELECT '=== ROW LEVEL SECURITY ===' AS verificacion;

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts')
ORDER BY tablename;

-- ============================================
-- 3. VERIFICAR POLÍTICAS RLS
-- ============================================
SELECT '=== POLITICAS RLS ===' AS verificacion;

SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- ============================================
-- 4. VERIFICAR FUNCIONES
-- ============================================
SELECT '=== FUNCIONES ===' AS verificacion;

SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_budget_spent',
    'auto_categorize_transaction',
    'check_budget_alerts',
    'get_category_expenses',
    'call_budget_alert_email_function',
    'validate_hex_color',
    'validate_regex_pattern',
    'validate_budget_period',
    'trigger_auto_categorize_and_check_alerts',
    'trigger_after_insert_check_alerts',
    'trigger_call_email_on_alert',
    'update_budgets_updated_at',
    'validate_regex_rule'
  )
ORDER BY routine_name;

-- ============================================
-- 5. VERIFICAR TRIGGERS
-- ============================================
SELECT '=== TRIGGERS ===' AS verificacion;

SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 6. VERIFICAR ÍNDICES
-- ============================================
SELECT '=== INDICES ===' AS verificacion;

SELECT tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts')
ORDER BY tablename, indexname;

-- ============================================
-- 7. VERIFICAR CATEGORÍAS DEL SISTEMA
-- ============================================
SELECT '=== CATEGORIAS DEL SISTEMA ===' AS verificacion;

SELECT COUNT(*) AS total_categorias_sistema
FROM categories 
WHERE is_system = TRUE;

-- Debe retornar: 15
SELECT name, icon, color 
FROM categories 
WHERE is_system = TRUE 
ORDER BY name;

-- ============================================
-- 8. VERIFICAR VISTA budget_summary
-- ============================================
SELECT '=== VISTA budget_summary ===' AS verificacion;

SELECT table_name, view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'budget_summary';

-- ============================================
-- 9. VERIFICAR CONSTRAINTS
-- ============================================
SELECT '=== CONSTRAINTS ===' AS verificacion;

SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- ============================================
-- 10. VERIFICAR FOREIGN KEYS
-- ============================================
SELECT '=== FOREIGN KEYS ===' AS verificacion;

SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- RESUMEN DE VERIFICACIÓN
-- ============================================
SELECT '=== RESUMEN ===' AS verificacion;

SELECT 
    'Tablas' AS componente,
    COUNT(*) AS cantidad
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts')

UNION ALL

SELECT 
    'Funciones' AS componente,
    COUNT(*) AS cantidad
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_budget_spent', 'auto_categorize_transaction', 'check_budget_alerts',
    'get_category_expenses', 'call_budget_alert_email_function'
  )

UNION ALL

SELECT 
    'Triggers' AS componente,
    COUNT(*) AS cantidad
FROM information_schema.triggers 
WHERE trigger_schema = 'public'

UNION ALL

SELECT 
    'Categorias Sistema' AS componente,
    COUNT(*) AS cantidad
FROM categories 
WHERE is_system = TRUE

UNION ALL

SELECT 
    'Politicas RLS' AS componente,
    COUNT(*) AS cantidad
FROM pg_policies 
WHERE schemaname = 'public';
