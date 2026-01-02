/**
 * Edge Function: Enviar alerta de presupuesto por email
 * WINM - What I Need Most
 * Principio KISS: Implementación simple y directa
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'WINM <noreply@winm.app>'

interface BudgetAlert {
  id: string
  user_id: string
  budget_id: string
  current_spent: number
  budget_amount: number
  percentage_used: number
  alert_type: 'threshold' | 'exceeded' | 'warning'
  created_at: string
}

serve(async (req) => {
  try {
    // Validar webhook secret si viene de PostgreSQL (opcional pero recomendado)
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
    if (webhookSecret) {
      const providedSecret = req.headers.get('X-Webhook-Secret')
      if (providedSecret !== webhookSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid webhook secret' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Obtener datos del request
    const { budget_alert_id } = await req.json()
    
    if (!budget_alert_id) {
      return new Response(
        JSON.stringify({ error: 'budget_alert_id es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener alerta y datos relacionados
    const { data: alert, error: alertError } = await supabase
      .from('budget_alerts')
      .select(`
        *,
        budgets!inner(
          *,
          categories!inner(name)
        ),
        users:auth.users!inner(email)
      `)
      .eq('id', budget_alert_id)
      .single()

    if (alertError || !alert) {
      return new Response(
        JSON.stringify({ error: 'Alerta no encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Obtener email del usuario
    const { data: userData } = await supabase.auth.admin.getUserById(alert.user_id)
    const userEmail = userData?.user?.email

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'Email del usuario no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Construir email
    const budget = alert.budgets
    const category = budget.categories
    const emailSubject = alert.alert_type === 'exceeded' 
      ? `⚠️ Presupuesto excedido: ${category.name}`
      : `📊 Alerta de presupuesto: ${category.name}`

    const emailBody = generateEmailTemplate(alert, budget, category)

    // Enviar email usando Resend
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no configurada, saltando envío de email')
      return new Response(
        JSON.stringify({ 
          message: 'Email no enviado (RESEND_API_KEY no configurada)',
          alert_id: budget_alert_id
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: userEmail,
        subject: emailSubject,
        html: emailBody,
      }),
    })

    if (!resendResponse.ok) {
      const error = await resendResponse.text()
      throw new Error(`Error enviando email: ${error}`)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Email enviado exitosamente',
        alert_id: budget_alert_id,
        user_email: userEmail
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en send-budget-alert-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function generateEmailTemplate(alert: BudgetAlert, budget: any, category: any): string {
  const statusColor = alert.alert_type === 'exceeded' ? '#ef4444' : '#f59e0b'
  const statusText = alert.alert_type === 'exceeded' ? 'EXCEDIDO' : 'ALERTA'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .stat { display: flex; justify-content: space-between; margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
    .stat-label { font-weight: bold; }
    .stat-value { color: ${statusColor}; font-size: 1.2em; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusText}</h1>
      <p>Presupuesto: ${category.name}</p>
    </div>
    <div class="content">
      <div class="stat">
        <span class="stat-label">Presupuesto:</span>
        <span class="stat-value">$${budget.amount.toFixed(2)}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Gastado:</span>
        <span class="stat-value">$${alert.current_spent.toFixed(2)}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Porcentaje usado:</span>
        <span class="stat-value">${alert.percentage_used.toFixed(1)}%</span>
      </div>
      ${alert.alert_type === 'exceeded' 
        ? '<p style="color: #ef4444; font-weight: bold;">⚠️ Has excedido tu presupuesto para esta categoría.</p>'
        : '<p style="color: #f59e0b;">📊 Te estás acercando al límite de tu presupuesto.</p>'
      }
    </div>
    <div class="footer">
      <p>WINM - What I Need Most</p>
      <p>Control financiero personal</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
