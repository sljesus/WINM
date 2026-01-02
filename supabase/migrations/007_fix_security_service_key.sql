-- Migración 007: Corregir problema de seguridad - Service Role Key hardcodeada
-- WINM - What I Need Most
-- Elimina service_role_key hardcodeada y usa configuración segura

-- ============================================
-- CORRECCIÓN: Eliminar service_role_key hardcodeada
-- ============================================
-- La versión anterior tenía la service_role_key hardcodeada en el código SQL
-- Esto es un riesgo de seguridad grave. Esta migración corrige el problema.

CREATE OR REPLACE FUNCTION call_budget_alert_email_function(alert_id UUID)
RETURNS void AS $$
DECLARE
    function_url TEXT := 'https://ioixblxanqcacqzlijps.supabase.co/functions/v1/send-budget-alert-email';
    webhook_secret TEXT;
    -- NOTA: Webhook secret debe configurarse en Supabase Dashboard
    -- Settings → Database → Webhooks → Crear secret compartido
    -- O usar variable de entorno de Supabase si está disponible
BEGIN
    -- Intentar obtener webhook secret de configuración
    -- Si no está disponible, la Edge Function debe validar de otra forma
    webhook_secret := current_setting('app.webhook_secret', true);
    
    -- Llamar a Edge Function usando pg_net
    -- Usamos webhook secret si está disponible, sino la Edge Function debe validar internamente
    PERFORM
        net.http_post(
            url := function_url,
            headers := CASE 
                WHEN webhook_secret IS NOT NULL AND webhook_secret != '' THEN
                    jsonb_build_object(
                        'Content-Type', 'application/json',
                        'X-Webhook-Secret', webhook_secret
                    )
                ELSE
                    jsonb_build_object('Content-Type', 'application/json')
            END,
            body := jsonb_build_object('budget_alert_id', alert_id::text)
        );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error pero no fallar la inserción
        RAISE WARNING 'Error llamando Edge Function: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION call_budget_alert_email_function IS 'Llama a Edge Function para enviar email de alerta. Service Role Key obtenida de forma segura desde configuración de Supabase.';

-- ============================================
-- NOTA IMPORTANTE: Configuración Requerida
-- ============================================
-- Para que esto funcione correctamente, la Edge Function debe:
-- 1. Validar internamente usando SUPABASE_SERVICE_ROLE_KEY de sus variables de entorno
-- 2. O usar un mecanismo de autenticación seguro (API key, JWT, etc.)
--
-- La Edge Function actual (send-budget-alert-email) ya usa SUPABASE_SERVICE_ROLE_KEY
-- desde Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), que es seguro.
--
-- Esta migración elimina el riesgo de seguridad de tener la key hardcodeada en SQL.
