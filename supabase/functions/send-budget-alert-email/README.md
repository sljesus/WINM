# Edge Function: send-budget-alert-email

Envía emails de alerta cuando se alcanza o excede un presupuesto.

## Configuración

### Variables de Entorno en Supabase

1. Ve a tu proyecto en Supabase
2. Settings → Edge Functions → Secrets
3. Agrega:
   - `RESEND_API_KEY`: Tu API key de Resend
   - `RESEND_FROM_EMAIL`: Email remitente (ej: "WINM <noreply@tudominio.com>")

### Configurar Resend

1. Crea cuenta en [resend.com](https://resend.com)
2. Obtén tu API key
3. Verifica tu dominio (opcional, puedes usar el dominio de Resend)

## Uso

Esta función se llama automáticamente mediante trigger cuando se crea una alerta en `budget_alerts`.

### Llamada Manual (para pruebas)

```bash
curl -X POST https://[TU_PROYECTO].supabase.co/functions/v1/send-budget-alert-email \
  -H "Authorization: Bearer [TU_ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"budget_alert_id": "uuid-de-la-alerta"}'
```

## Despliegue

```bash
supabase functions deploy send-budget-alert-email
```
