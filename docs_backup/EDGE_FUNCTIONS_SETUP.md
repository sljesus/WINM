# 🔧 Configuración de Edge Functions - WINM

## Estado Actual

✅ **Edge Function Creada y Desplegada:**
- `send-budget-alert-email` - Envía emails cuando se alcanza/excede presupuesto
- URL: https://ioixblxanqcacqzlijps.supabase.co/functions/v1/send-budget-alert-email

✅ **Migración 006 y 007 Ejecutadas:**
- Trigger conectado con Edge Function
- Función `call_budget_alert_email_function()` creada
- Trigger `trigger_after_insert_budget_alert` activo
- Service Role Key eliminada (seguridad corregida)
- Webhook secret implementado

⚠️ **Pendiente (Configuración Manual):**
- Configurar variables de entorno (RESEND_API_KEY, RESEND_FROM_EMAIL)

---

## Paso 1: Desplegar Edge Function

### Opción A: Con Supabase CLI (Recomendado)

```bash
# Desde la raíz del proyecto
supabase functions deploy send-budget-alert-email
```

### Opción B: Desde Dashboard

1. Ve a: https://supabase.com/dashboard/project/ioixblxanqcacqzlijps/functions
2. Haz clic en "Create a new function"
3. Nombre: `send-budget-alert-email`
4. Copia el contenido de `supabase/functions/send-budget-alert-email/index.ts`
5. Guarda y despliega

---

## Paso 2: Configurar Variables de Entorno

### En Supabase Dashboard:

1. Ve a: Settings → Edge Functions → Secrets
2. Agrega:
   - `RESEND_API_KEY`: Tu API key de Resend
   - `RESEND_FROM_EMAIL`: `WINM <noreply@winm.app>` (o tu email)

### Configurar Resend:

1. Crea cuenta en [resend.com](https://resend.com)
2. Obtén tu API key desde el dashboard
3. (Opcional) Verifica tu dominio para emails personalizados

---

## Paso 3: Conectar Trigger con Edge Function

Ejecuta la migración 006:

```bash
supabase db push
```

O manualmente en SQL Editor:

```sql
-- Ver migración: supabase/migrations/006_add_edge_function_trigger.sql
```

Esta migración:
- Crea función `call_budget_alert_email_function()` que llama a la Edge Function
- Crea trigger que se ejecuta cuando se inserta una alerta en `budget_alerts`
- Usa `pg_net` (extensión de Supabase) para hacer HTTP requests

---

## Paso 4: Verificar que Funciona

### Prueba Manual:

1. Crea un presupuesto en la app
2. Inserta transacciones que alcancen el threshold
3. Verifica que se crea la alerta en `budget_alerts`
4. Verifica que se envía el email (o al menos que se llama la función)

### Ver Logs:

```bash
# Ver logs de Edge Functions
supabase functions logs send-budget-alert-email
```

O en Dashboard: Edge Functions → `send-budget-alert-email` → Logs

---

## Cómo Funciona

1. **Trigger en PostgreSQL**: Cuando se inserta una transacción, el trigger `trigger_after_insert_transaction` llama a `check_budget_alerts()`
2. **Función check_budget_alerts**: Verifica si se alcanza el threshold y crea una alerta en `budget_alerts`
3. **Trigger de alerta**: Cuando se inserta en `budget_alerts`, el trigger `trigger_after_insert_budget_alert` llama a `call_budget_alert_email_function()`
4. **Edge Function**: Recibe el `budget_alert_id`, obtiene datos del usuario y presupuesto, y envía email usando Resend

---

## Solución de Problemas

### Error: "pg_net extension not found"
```sql
-- Habilitar extensión (debería estar habilitada por defecto)
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Error: "Function not found"
- Verifica que la Edge Function esté desplegada
- Verifica la URL en la función `call_budget_alert_email_function()`

### Error: "RESEND_API_KEY not configured"
- Configura el secret en Supabase Dashboard
- Verifica que el nombre sea exactamente `RESEND_API_KEY`

### Emails no se envían
- Verifica logs de Edge Function
- Verifica que Resend API key sea válida
- Verifica que el email del usuario exista en Supabase Auth

---

## Estado y Verificación

### Estado Actual

✅ **Edge Function Desplegada:**
- `send-budget-alert-email` desplegada en Supabase
- URL: https://ioixblxanqcacqzlijps.supabase.co/functions/v1/send-budget-alert-email

✅ **Migraciones Ejecutadas:**
- Migración 006: Trigger conectado con Edge Function
- Migración 007: Seguridad corregida (Service Role Key eliminada, Webhook secret implementado)

✅ **Funciones y Triggers Activos:**
- Función `call_budget_alert_email_function()` creada
- Trigger `trigger_after_insert_budget_alert` activo

⚠️ **Pendiente (Configuración Manual):**
- Variables de entorno: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Pruebas end-to-end con emails reales

### Cómo Funciona Ahora

1. **Usuario inserta transacción** → Trigger `trigger_after_insert_transaction`
2. **Se verifica presupuesto** → Función `check_budget_alerts()`
3. **Si alcanza threshold** → Se crea alerta en `budget_alerts`
4. **Trigger de alerta** → `trigger_after_insert_budget_alert` llama a Edge Function
5. **Edge Function** → Envía email usando Resend (si está configurado)

### Probar

**Opción 1: Crear alerta manualmente**
```sql
INSERT INTO budget_alerts (
    user_id, budget_id, current_spent, budget_amount,
    percentage_used, alert_type
) VALUES (
    'tu-user-id', 'tu-budget-id', 1000.00, 1000.00,
    100.00, 'threshold'
);
```

**Opción 2: Insertar transacción que active alerta**
1. Crea un presupuesto en la app
2. Inserta transacciones que alcancen el threshold
3. Verifica logs de Edge Function

### Ver Logs

```bash
# Ver logs de Edge Function
supabase functions logs send-budget-alert-email
```

O en Dashboard:
https://supabase.com/dashboard/project/ioixblxanqcacqzlijps/functions/send-budget-alert-email/logs

---

## Próximos Pasos

Después de configurar:
1. ✅ Probar con una transacción real
2. ✅ Verificar que los emails lleguen
3. ✅ Mejorar template de email si es necesario
4. ✅ Agregar más Edge Functions si es necesario
