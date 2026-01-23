/**
 * Edge Function: Proxy seguro para análisis de emails con OpenAI
 * WINM - What I Need Most
 * 
 * Esta función actúa como proxy entre el frontend y OpenAI API,
 * manteniendo la API key segura en el servidor (Edge Function)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Obtener API key de OpenAI desde secrets (configurado en Supabase Dashboard)
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-3.5-turbo'

interface EmailContent {
  id: string
  subject: string
  body: string
  from: string
  date: string
}

interface AnalysisRequest {
  emailContent: EmailContent
  categories?: Array<{ id: string; name: string }>
}

Deno.serve(async (req) => {
  // Manejar preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  try {
    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido. Use POST.' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Validar API key de OpenAI
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY no configurada en secrets')
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key no configurada. Contacte al administrador.' 
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Obtener datos del request
    const { emailContent, categories }: AnalysisRequest = await req.json()

    if (!emailContent || !emailContent.subject || !emailContent.body) {
      return new Response(
        JSON.stringify({ error: 'emailContent con subject y body es requerido' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    console.log(`📧 Analizando email: ${emailContent.id}`)

    // Construir prompt para OpenAI
    const prompt = buildAnalysisPrompt(emailContent, categories)

    // Llamar a OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de emails bancarios mexicanos. Extrae información precisa de transacciones financieras. Responde únicamente con JSON válido sin markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Baja temperatura para respuestas consistentes
        max_tokens: 300
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error(`❌ Error de OpenAI API: ${openaiResponse.status}`, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Error al analizar email: ${openaiResponse.statusText}`,
          details: errorText
        }),
        { 
          status: openaiResponse.status, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    const data = await openaiResponse.json()
    let responseText = data.choices[0].message.content.trim()

    // Limpiar respuesta (remover markdown si existe)
    responseText = responseText.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()

    // Parsear respuesta JSON
    let analysisResult
    try {
      analysisResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Error parseando respuesta de OpenAI:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Error parseando respuesta de OpenAI',
          rawResponse: responseText
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Validar y formatear respuesta
    const transaction = formatTransaction(analysisResult, emailContent)

    // Si formatTransaction retorna null, no es una transacción válida
    if (!transaction) {
      console.log(`🚫 Email ${emailContent.id} no es una transacción válida`)
      return new Response(
        JSON.stringify({
          success: false,
          transaction: null,
          reason: 'No es una transacción válida (pago rechazado, estado de cuenta, límite, etc.)',
          analyzer_used: 'OpenAI'
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          } 
        }
      )
    }

    console.log(`✅ Email analizado exitosamente: ${emailContent.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        transaction: transaction,
        analyzer_used: 'OpenAI',
        confidence: analysisResult.confidence || 0.8
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        } 
      }
    )

  } catch (error) {
    console.error('❌ Error en analyze-email:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})

/**
 * Construye el prompt para OpenAI basado en el contenido del email
 */
function buildAnalysisPrompt(emailContent: EmailContent, categories?: Array<{ id: string; name: string }>): string {
  const categoriesList = categories 
    ? categories.map(c => `- ${c.name}`).join('\n')
    : 'Categorías disponibles se determinarán automáticamente'

  return `Analiza el siguiente email bancario y determina si es una transacción financiera VÁLIDA (que realmente afectó el balance de la cuenta).

IMPORTANTE: EXCLUYE los siguientes casos (NO son transacciones válidas):
- Pagos rechazados, intentos fallidos, transacciones canceladas
- Notificaciones de error, fallos en el procesamiento
- Promociones, ofertas, publicidad, newsletters
- Estados de cuenta, resúmenes mensuales, extractos bancarios
- Información de límites de crédito disponibles (ej: "tu límite es de $X")
- Notificaciones informativas que no representan movimientos reales de dinero
- Invitaciones a descargar estados de cuenta
- Información sobre saldos disponibles, límites, o capacidades de crédito
- Reportes de integración, métricas de desempeño, análisis técnicos (ej: "Medimos el desempeño de tu integración")
- Informes de API, webhooks, endpoints, o métricas de desarrollador
- Cualquier correo que mencione "integración", "desempeño", "métrica", "reporte técnico", "análisis de API"
- Solo incluye notificaciones de transacciones INDIVIDUALES que realmente se completaron

Email:
Asunto: ${emailContent.subject}
De: ${emailContent.from}
Fecha: ${emailContent.date}
Contenido: ${emailContent.body.substring(0, 2000)}

Categorías disponibles:
${categoriesList}

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "is_transaction": boolean (true solo si es una transacción válida que afectó el balance),
  "amount": número (positivo para ingresos, negativo para gastos) - solo si is_transaction es true,
  "description": "descripción clara y concisa" - solo si is_transaction es true,
  "date": "YYYY-MM-DD" - solo si is_transaction es true,
  "transaction_type": "compra|transferencia|ingreso|retiro|pago" - solo si is_transaction es true,
  "category": "nombre de categoría más apropiada" - solo si is_transaction es true,
  "confidence": número entre 0 y 1,
  "reason": "razón por la que se excluyó" - solo si is_transaction es false
}

Si NO es una transacción válida (pago rechazado, intento fallido, etc.), responde con:
{"is_transaction": false, "reason": "Pago rechazado/Intento fallido/No es transacción válida"}

Si es una transacción válida, responde con is_transaction: true y los demás campos.`
}

/**
 * Identifica la fuente desde el contenido del email
 * Retorna solo valores permitidos por la BD: 'Mercado Pago', 'BBVA', 'NU', 'Plata Card'
 */
function identifySourceFromEmail(emailContent: EmailContent): string {
  const from = (emailContent.from || '').toLowerCase()
  const subject = (emailContent.subject || '').toLowerCase()
  const body = (emailContent.body || '').toLowerCase()
  const text = `${from} ${subject} ${body}`

  const sources = {
    'mercado pago': 'Mercado Pago',
    'mercadopago': 'Mercado Pago',
    'mercadolibre': 'Mercado Pago', // Mercado Libre usa Mercado Pago
    'bbva': 'BBVA',
    'nu': 'NU',
    'plata card': 'Plata Card',
    'plata': 'Plata Card'
  }

  for (const [key, value] of Object.entries(sources)) {
    if (text.includes(key)) {
      return value
    }
  }

  // Fallback: Mercado Pago es el más común
  return 'Mercado Pago'
}

/**
 * Formatea la respuesta de OpenAI en el formato esperado por el frontend
 */
function formatTransaction(analysisResult: any, emailContent: EmailContent): any {
  // Si hay error en el análisis, retornar null
  if (analysisResult.error) {
    console.log(`🚫 Email excluido por error en análisis: ${analysisResult.error}`)
    return null
  }

  // Si la IA determinó que NO es una transacción válida, retornar null
  if (analysisResult.is_transaction === false) {
    console.log(`🚫 Email excluido por IA (no es transacción válida): ${analysisResult.reason || 'Razón no especificada'}`)
    return null
  }

  // Si is_transaction no está definido pero hay campos, asumir que es transacción (backward compatibility)
  // Pero validar que no sea un pago rechazado por descripción
  if (analysisResult.is_transaction === undefined) {
    const description = (analysisResult.description || '').toLowerCase()
    const subject = (emailContent.subject || '').toLowerCase()
    const body = (emailContent.body || '').toLowerCase()
    const fullText = `${subject} ${body} ${description}`.toLowerCase()
    
    // Detectar pagos rechazados, intentos fallidos, estados de cuenta, límites, reportes técnicos, etc.
    const rejectionKeywords = [
      'pago rechazado', 'rechazado', 'rechazada', 'intento fallido',
      'no se pudo', 'no se completó', 'falló', 'fallido', 'error en el pago',
      'pago no procesado', 'transacción cancelada', 'cancelado', 'cancelada',
      'estado de cuenta', 'descargar tu estado', 'descarga tu estado',
      'tu límite es', 'límite disponible', 'límite de crédito',
      'resumen mensual', 'extracto bancario', 'resumen de cuenta',
      'ya puedes descargar', 'descarga tu resumen',
      // Reportes, métricas e informes técnicos (no son transacciones)
      'integración', 'integraciones', 'desempeño', 'medimos', 'métrica', 'métricas',
      'reporte', 'reportes', 'análisis', 'estadística', 'estadísticas',
      'dashboard', 'monitoreo', 'seguimiento', 'rendimiento', 'performance',
      'api', 'endpoint', 'webhook', 'desarrollador', 'developer'
    ]
    
    if (rejectionKeywords.some(keyword => fullText.includes(keyword))) {
      console.log(`🚫 Email excluido (pago rechazado detectado en texto): ${emailContent.subject.substring(0, 50)}`)
      return null
    }
  }

  // Validar campos requeridos
  if (!analysisResult.amount || !analysisResult.description) {
    return null
  }

  // Determinar si es gasto o ingreso
  const amount = parseFloat(analysisResult.amount)
  const isExpense = amount < 0 || 
                    analysisResult.transaction_type?.toLowerCase().includes('compra') ||
                    analysisResult.transaction_type?.toLowerCase().includes('gasto') ||
                    analysisResult.transaction_type?.toLowerCase().includes('pago')

  // Formatear fecha
  let transactionDate = emailContent.date
  if (analysisResult.date) {
    try {
      // Intentar parsear fecha de OpenAI
      const parsedDate = new Date(analysisResult.date)
      if (!isNaN(parsedDate.getTime())) {
        transactionDate = parsedDate.toISOString().split('T')[0]
      }
    } catch (e) {
      // Usar fecha del email si falla
    }
  }

  // Identificar source válido desde el email (solo valores permitidos por BD)
  const source = identifySourceFromEmail(emailContent)
  
  return {
    amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
    description: analysisResult.description.trim(),
    date: transactionDate,
    source: source, // Solo valores permitidos: 'Mercado Pago', 'BBVA', 'NU', 'Plata Card'
    transaction_type: analysisResult.transaction_type || 'compra',
    email_id: emailContent.id,
    email_subject: emailContent.subject,
    needs_categorization: false,
    bank: source, // Usar mismo valor que source
    category: analysisResult.category || null,
    confidence: analysisResult.confidence || 0.8
  }
}
