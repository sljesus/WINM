// js/services/analyzers/OpenAIEmailAnalyzer.js
// Analizador que usa OpenAI API
// Principio SOLID: Single Responsibility - solo análisis con OpenAI

import { IEmailAnalyzer } from './IEmailAnalyzer.js';

/**
 * Analizador de emails usando OpenAI API
 * SOLID SRP: solo análisis con IA. Categorías se inyectan vía options (orquestador).
 */
export class OpenAIEmailAnalyzer extends IEmailAnalyzer {
    constructor(apiKey) {
        super();
        this.name = 'OpenAIEmailAnalyzer';
        this.apiKey = apiKey; // Deprecated: ahora se usa Edge Function
        this.initialized = false;
        this.supabaseUrl = null;
        this.supabaseAnonKey = null;
    }

    async initialize() {
        if (this.initialized) return;
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config?.supabase?.url || !config?.supabase?.anonKey) {
            throw new Error('Configuración de Supabase incompleta. Verifica config.js');
        }
        this.supabaseUrl = config.supabase.url;
        this.supabaseAnonKey = config.supabase.anonKey;
        this.initialized = true;
    }

    /**
     * Analiza email usando OpenAI vía Edge Function.
     * @param {Object} emailContent - Contenido del email
     * @param {Object} [options] - { categories } inyectadas por orquestador (no obtiene aquí).
     */
    async analyzeEmail(emailContent, options = {}) {
        try {
            await this.initialize();
            const categories = options.categories ?? [];

            const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/analyze-email`;
            const apiResponse = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.supabaseAnonKey}`
                },
                body: JSON.stringify({
                    emailContent: {
                        id: emailContent.id,
                        subject: emailContent.subject || '',
                        body: emailContent.body || '',
                        from: emailContent.from || '',
                        date: emailContent.date || new Date().toISOString()
                    },
                    categories
                })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json().catch(() => ({ error: apiResponse.statusText }));
                throw new Error(`Edge Function error: ${apiResponse.status} - ${errorData.error || apiResponse.statusText}`);
            }

            const data = await apiResponse.json();

            if (!data.success || !data.transaction) {
                // No es un error - simplemente no es una transacción válida (pago rechazado, estado de cuenta, etc.)
                // Solo loggear en modo debug
                return null;
            }

            // La Edge Function ya devuelve la transacción formateada
            const transaction = data.transaction;

            // Agregar metadatos adicionales
            transaction.confidence = data.confidence || 0.8;
            transaction.analyzed_by_ai = true;
            transaction.analyzer_used = this.name;

            // Log removido - se muestra en el progreso de importación
            return transaction;

        } catch (error) {
            console.error(`❌ ${this.name}: Error en análisis con OpenAI (Edge Function):`, error);
            return null;
        }
    }

    /**
     * Construye el prompt para OpenAI
     * @param {Object} emailContent - Contenido del email
     * @returns {string} Prompt estructurado
     */
    _buildAnalysisPrompt(emailContent) {
        const subject = emailContent.subject || '';
        const body = emailContent.body || '';
        const from = emailContent.from || '';

        return `
Analiza este email bancario y extrae información de transacción financiera.

**CONTENIDO DEL EMAIL:**
Asunto: ${subject}
De: ${from}
Cuerpo: ${body.substring(0, 800)}...

**INSTRUCCIONES:**
1. Busca ÚNICAMENTE información sobre transacciones monetarias (compras, pagos, ingresos, retiros, transferencias)
2. Si no hay información financiera clara, responde: {"is_transaction": false}
3. Para la descripción: usa UNA FRASE SIMPLE en español que explique qué sucedió
4. NUNCA copies texto técnico, CSS, HTML, o código
5. Evita frases como "ght text align", "display none", "font-family", etc.

**FORMATO JSON (solo JSON, nada más):**
{
    "is_transaction": true,
    "amount": 123.45,
    "description": "Pago en tienda X",
    "date": "2024-01-01T00:00:00Z",
    "transaction_type": "compra",
    "source": "Mercado Pago",  // SOLO usar: "Mercado Pago", "BBVA", "NU", "Plata Card"
    "confidence": 0.9
}

**VALORES PERMITIDOS PARA source:**
- "Mercado Pago"
- "BBVA"
- "NU"
- "Plata Card"

**IMPORTANTE:** El campo "source" debe ser EXACTAMENTE uno de los valores de arriba. Si no sabes cuál es, usa "Mercado Pago" por defecto.

**EJEMPLOS DE DESCRIPCIONES BUENAS:**
- "Compra en supermercado"
- "Transferencia recibida de Juan"
- "Pago de servicio de internet"
- "Retiro de cajero automático"

**EJEMPLOS DE DESCRIPCIONES MALAS (evitar):**
- "ght text align right iortant"
- "{ display: none !important }"
- "font-family: 'Proxima Nova'"
- "MessageViewBody,#MessageWebViewDiv"
        `;
    }

    /**
     * Parsea y valida la respuesta de OpenAI
     * @param {string} response - Respuesta JSON de OpenAI
     * @param {Object} emailContent - Contenido original del email
     * @returns {Object|null} Transacción estructurada o null
     */
    _parseAndValidateResponse(response, emailContent) {
        try {
            const data = JSON.parse(response.trim());

            // Si no es transacción
            if (!data.is_transaction) {
                console.log(`ℹ️ ${this.name}: Email no es una transacción`);
                return null;
            }

            // Validaciones básicas
            if (!data.amount || typeof data.amount !== 'number' || data.amount === 0) {
                console.warn(`⚠️ ${this.name}: Monto inválido en respuesta:`, data.amount);
                return null;
            }

            // Limpiar y validar descripción
            let description = data.description || 'Transacción analizada por IA';
            description = this._cleanDescription(description);

            // Validar que la descripción no sea sospechosa
            if (!this._isValidDescription(description)) {
                console.warn(`⚠️ ${this.name}: Descripción inválida de OpenAI: "${description}", usando fallback`);
                description = 'Transacción procesada por IA';
            }

            // Determinar source válido (solo valores permitidos por BD)
            let source = this._identifySourceFromEmail(emailContent);

            // Si OpenAI dio un source válido, úsalo; sino usa el identificado
            const validSources = ['Mercado Pago', 'BBVA', 'NU', 'Plata Card'];
            if (data.source && validSources.includes(data.source)) {
                source = data.source;
            }

            // Si la descripción parece ser un source personalizado, moverlo a description
            if (data.source && !validSources.includes(data.source) && data.source !== source) {
                // Combinar source personalizado con descripción
                if (description === 'Transacción procesada por IA') {
                    description = data.source;
                } else {
                    description = `${data.source} - ${description}`;
                }
            }

            // Estructurar transacción completa
            const transaction = {
                amount: data.amount,
                description: description,
                date: data.date || emailContent.date || new Date().toISOString(),
                source: source, // Solo valores permitidos por BD
                transaction_type: data.transaction_type || 'otro',
                email_id: emailContent.id,
                email_subject: emailContent.subject,
                needs_categorization: (data.confidence || 0) < 0.8,
                bank: source,
                confidence: data.confidence || 0.8,
                analyzed_by_ai: true,
                analyzer_used: this.name
            };

            console.log(`✅ ${this.name}: Transacción extraída: ${transaction.description} - $${transaction.amount}`);
            return transaction;

        } catch (error) {
            console.error(`❌ ${this.name}: Error parseando respuesta JSON:`, error);
            console.error('Respuesta problemática:', response);
            return null;
        }
    }

    /**
     * Identifica la fuente desde el contenido del email
     * @param {Object} emailContent - Contenido del email
     * @returns {string} Fuente identificada
     */
    _identifySourceFromEmail(emailContent) {
        const from = (emailContent.from || '').toLowerCase();
        const subject = (emailContent.subject || '').toLowerCase();
        const body = (emailContent.body || '').toLowerCase();
        const text = `${from} ${subject} ${body}`;

        const sources = {
            'mercado pago': 'Mercado Pago',
            'mercadopago': 'Mercado Pago',
            'mercadolibre': 'Mercado Pago', // Mercado Libre usa Mercado Pago
            'bbva': 'BBVA',
            'nu': 'NU',
            'plata card': 'Plata Card',
            'plata': 'Plata Card'
        };

        for (const [key, value] of Object.entries(sources)) {
            if (text.includes(key)) {
                return value;
            }
        }

        // Fallback: Mercado Pago es el más común (nunca retornar 'Desconocido')
        return 'Mercado Pago';
    }

    /**
     * Limpia una descripción de OpenAI
     */
    _cleanDescription(description) {
        if (!description) return 'Transacción procesada por IA';

        // Remover caracteres extraños
        let clean = description.replace(/[^\w\sáéíóúüñ¿¡.,-]/g, ' ');

        // Remover palabras sospechosas
        clean = clean.replace(/\b(display|font|color|style|class|id|body|html|div|span)\b/gi, '');

        // Remover URLs y paths
        clean = clean.replace(/https?:\/\/[^\s]+/g, '');
        clean = clean.replace(/url\([^\)]+\)/g, '');

        // Normalizar espacios
        clean = clean.replace(/\s+/g, ' ').trim();

        // Si queda vacío, usar fallback
        return clean || 'Transacción procesada por IA';
    }

    /**
     * Valida que una descripción sea apropiada
     */
    _isValidDescription(description) {
        if (!description || description.length < 3) return false;

        // No debe contener caracteres de CSS/HTML
        if (/[{};:@#<>]/.test(description)) return false;

        // No debe ser muy largo sin sentido
        if (description.length > 80) return false;

        // Debe contener al menos una letra
        if (!/[a-záéíóúüñ]/i.test(description)) return false;

        // No debe parecer CSS (patrones comunes)
        const cssPatterns = [
            /^display\s/i,
            /^font-/i,
            /^color/i,
            /\{.*\}/,
            /url\(/i,
            /src=/i
        ];

        for (const pattern of cssPatterns) {
            if (pattern.test(description)) return false;
        }

        return true;
    }
}