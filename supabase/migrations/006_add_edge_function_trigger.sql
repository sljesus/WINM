-- Migración 006: Conectar Edge Function con triggers de alertas
-- WINM - What I Need Most
-- Crea trigger que llama a Edge Function cuando se crea una alerta

-- ============================================
-- FUNCIÓN: Llamar a Edge Function para enviar email
-- ============================================
-- Usa pg_net (extensión de Supabase) para hacer HTTP requests a Edge Functions
CREATE OR REPLACE FUNCTION call_budget_alert_email_function(alert_id UUID)
RETURNS void AS $$
DECLARE
    supabase_url TEXT;
    function_url TEXT;
BEGIN
    -- Obtener URL de Supabase desde variables de entorno o configuración
    -- En Supabase, esto se puede obtener de la configuración del proyecto
    -- Por ahora, usamos una variable de entorno o configuración
    
    -- Construir URL de la Edge Function
    -- Nota: En producción, esto debería venir de una tabla de configuración
    -- o variable de entorno. Por ahora usamos el formato estándar de Supabase
    supabase_url := current_setting('app.supabase_url', true);
    
    -- Si no está configurada, usar formato por defecto
    IF supabase_url IS NULL OR supabase_url = '' THEN
        -- En Supabase, las Edge Functions están en: https://[project-ref].supabase.co/functions/v1/[function-name]
        -- Necesitamos obtener el project_ref de alguna manera
        -- Por ahora, dejamos que falle silenciosamente si no está configurado
        RETURN;
    END IF;
    
    function_url := supabase_url || '/functions/v1/send-budget-alert-email';
    
    -- Llamar a la Edge Function usando pg_net (extensión de Supabase)
    -- pg_net permite hacer HTTP requests desde PostgreSQL
    PERFORM
        net.http_post(
            url := function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
            ),
            body := jsonb_build_object('budget_alert_id', alert_id)
        );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error pero no fallar la inserción de la alerta
        RAISE WARNING 'Error llamando Edge Function para alerta %: %', alert_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION call_budget_alert_email_function IS 'Llama a Edge Function para enviar email de alerta de presupuesto';

-- ============================================
-- TRIGGER: Llamar Edge Function cuando se crea alerta
-- ============================================
CREATE OR REPLACE FUNCTION trigger_call_email_on_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Llamar a Edge Function de forma asíncrona (no bloquea la inserción)
    -- Usar pg_net para hacer la llamada HTTP
    PERFORM call_budget_alert_email_function(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_insert_budget_alert
    AFTER INSERT ON budget_alerts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_call_email_on_alert();

COMMENT ON FUNCTION trigger_call_email_on_alert IS 'Trigger que llama a Edge Function cuando se crea una alerta de presupuesto';

-- ============================================
-- NOTA: Configuración necesaria
-- ============================================
-- Para que esto funcione, necesitas:
-- 1. Habilitar extensión pg_net en Supabase (ya viene habilitada por defecto)
-- 2. Configurar variables en Supabase:
--    - app.supabase_url: https://ioixblxanqcacqzlijps.supabase.co
--    - app.service_role_key: Tu service role key
-- 
-- O mejor aún, usar la función directamente con la URL hardcodeada (más simple):
-- 
-- ALTERNATIVA SIMPLE (recomendada para empezar):
-- Modificar la función para usar la URL directamente

-- ============================================
-- VERSIÓN SIMPLIFICADA (sin variables de entorno)
-- ============================================
CREATE OR REPLACE FUNCTION call_budget_alert_email_function(alert_id UUID)
RETURNS void AS $$
DECLARE
    function_url TEXT := 'https://ioixblxanqcacqzlijps.supabase.co/functions/v1/send-budget-alert-email';
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvaXhibHhhbnFjYWNxemxpanBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIyMzQ2OCwiZXhwIjoyMDgyNzk5NDY4fQ.ZYJ2dfV8MHXj4rtrfEQGqKSYUxCkH43x_iMH0_zwz5M';
BEGIN
    -- Llamar a Edge Function usando pg_net
    PERFORM
        net.http_post(
            url := function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_role_key
            ),
            body := jsonb_build_object('budget_alert_id', alert_id::text)
        );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error pero no fallar la inserción
        RAISE WARNING 'Error llamando Edge Function: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION call_budget_alert_email_function IS 'Llama a Edge Function para enviar email de alerta (versión simplificada con URL hardcodeada)';
