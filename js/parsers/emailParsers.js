// Parsers de emails bancarios para JavaScript
// Principio SOLID: Open/Closed - Extensible sin modificar código base
// Principio KISS: Simple y directo

/**
 * Clase base para parsers de emails bancarios
 * Sigue principio SOLID: Open/Closed
 */
class BaseEmailParser {
    constructor(sourceName) {
        this.sourceName = sourceName;
    }

    /**
     * Parsea el contenido de un email y extrae información de transacción
     * @param {Object} emailContent - Contenido del email
     * @returns {Object|null} Datos de transacción o null si no es válido
     */
    parse(emailContent) {
        throw new Error('Método parse() debe ser implementado por subclases');
    }

    /**
     * Extrae monto de un texto
     * @param {string} text - Texto que contiene el monto
     * @returns {number|null} Monto extraído o null
     */
    extractAmount(text) {
        if (!text) return null;
        
        // Limpiar texto primero
        const cleanText = this.cleanAmountText(text);

        // Patrones mejorados para montos (priorizar montos con contexto de transacción)
        const patterns = [
            // Monto con símbolo de peso mexicano (más específico: cerca de palabras clave)
            /(?:recibiste|ingresó|pagaste|pago|monto|total|importe|cantidad|dinero)[\s:]*\$?\s*([\d,]+\.?\d{2})/i,
            // Monto con símbolo de peso mexicano (general)
            /\$\s*([\d,]+\.?\d{2})/,
            // Monto con palabras de moneda
            /([\d,]+\.?\d{2})\s*(?:MXN|pesos|peso|mxn)/i,
            // Monto con símbolo (sin decimales estrictos)
            /\$\s*([\d,]+\.?\d*)/,
            // Monto solo con números (solo si tiene formato de dinero: 3+ dígitos o con decimales)
            /\b(\d{3,}(?:,\d{3})*(?:\.\d{2})?)\b/,
            // Monto pequeño con decimales (100.00, 140.00, etc.)
            /\b(\d{1,3}\.\d{2})\b/
        ];

        for (const pattern of patterns) {
            const matches = [...cleanText.matchAll(new RegExp(pattern.source, pattern.flags + 'g'))];
            for (const match of matches) {
                if (match[1]) {
                    const cleanAmount = match[1].replace(/,/g, '');
                    const amount = parseFloat(cleanAmount);
                    
                    // Validar: debe ser > 0 y razonable (< 10 millones)
                    if (!isNaN(amount) && amount > 0 && amount < 10000000) {
                        return amount;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Limpia el texto para extracción de montos
     */
    cleanAmountText(text) {
        if (!text) return '';

        // Remover HTML y CSS
        let clean = text.replace(/<[^>]+>/g, ' ');
        clean = clean.replace(/style\s*=\s*["'][^"']*["']/gi, ' ');
        clean = clean.replace(/class\s*=\s*["'][^"']*["']/gi, ' ');

        // Remover URLs
        clean = clean.replace(/https?:\/\/[^\s]+/g, ' ');

        // Mantener solo números, puntos, comas, espacios y símbolos de moneda
        clean = clean.replace(/[^\d\s.,$MXNmxn]/g, ' ');

        // Normalizar espacios
        clean = clean.replace(/\s+/g, ' ');

        return clean.trim();
    }

    /**
     * Extrae fecha de un texto o usa fecha del email
     * @param {string} text - Texto que puede contener fecha
     * @param {string} emailDate - Fecha del email como fallback
     * @returns {string|null} Fecha en formato ISO
     */
    extractDate(text, emailDate) {
        // Patrones de fecha comunes
        const datePatterns = [
            /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/,  // DD/MM/YYYY
            /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/   // YYYY/MM/DD
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    let year, month, day;
                    if (match[1].length === 4) { // YYYY/MM/DD
                        [year, month, day] = match.slice(1);
                    } else { // DD/MM/YYYY
                        [day, month, year] = match.slice(1);
                    }

                    // Crear fecha ISO
                    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
                    return date.toISOString();
                } catch (error) {
                    continue;
                }
            }
        }

        // Fallback: usar fecha del email
        if (emailDate) {
            try {
                const date = new Date(emailDate);
                return date.toISOString();
            } catch (error) {
                // Ignorar error
            }
        }

        // Último fallback: fecha actual
        return new Date().toISOString();
    }

    /**
     * Normaliza descripción de transacción
     * @param {string} text - Texto a normalizar
     * @returns {string} Descripción normalizada
     */
    normalizeDescription(text) {
        if (!text) return '';

        // Limpiar espacios múltiples
        text = text.replace(/\s+/g, ' ');
        // Eliminar caracteres especiales al inicio/fin
        text = text.replace(/^[,.;:!?]+|[,.;:!?]+$/g, '');
        // Limitar longitud
        if (text.length > 200) {
            text = text.substring(0, 197) + '...';
        }

        return text.trim();
    }

    /**
     * Valida que los datos de transacción sean correctos
     * @param {Object} data - Datos de transacción
     * @returns {boolean} True si es válido
     */
    validateTransaction(data) {
        const requiredFields = ['amount', 'description', 'date', 'source', 'transaction_type'];

        // Verificar campos requeridos
        for (const field of requiredFields) {
            if (!(field in data) || data[field] === null || data[field] === undefined) {
                return false;
            }
        }

        // Verificar que amount sea numérico
        if (typeof data.amount !== 'number' || isNaN(data.amount)) {
            return false;
        }

        // Verificar tipos válidos
        const validTypes = ['compra', 'ingreso', 'transferencia', 'retiro', 'otro'];
        if (!validTypes.includes(data.transaction_type)) {
            return false;
        }

        // Verificar fuentes válidas
        const validSources = ['Mercado Pago', 'NU', 'Plata Card', 'BBVA', 'Mercado Libre'];
        if (!validSources.includes(data.source)) {
            return false;
        }

        return true;
    }

    /**
     * Determina el tipo de transacción basado en el texto
     * @param {string} text - Texto del email
     * @returns {string} Tipo de transacción
     */
    determineTransactionType(text) {
        const textLower = text.toLowerCase();

        if (/(compra|cargo|pago|gasto)/.test(textLower)) {
            return 'compra';
        } else if (/(ingreso|abono|deposito|recibiste)/.test(textLower)) {
            return 'ingreso';
        } else if (/(retiro|retiraste|sacar)/.test(textLower)) {
            return 'retiro';
        } else if (/(transferencia|transferiste)/.test(textLower)) {
            return 'transferencia';
        } else {
            return 'otro';
        }
    }
}

/**
 * Parser para emails de Mercado Pago
 */
class MercadoPagoEmailParser extends BaseEmailParser {
    constructor() {
        super('Mercado Pago');
    }

    parse(emailContent) {
        const subject = emailContent.subject || '';
        const body = emailContent.body || '';
        const emailId = emailContent.id || '';
        const emailDate = emailContent.date || '';

        // Verificar si es notificación de transacción
        if (!this.isTransactionNotification(emailContent)) {
            return null;
        }

        // Extraer monto
        const amount = this.extractAmount(body || subject);
        if (amount === null) {
            return null;
        }

        // Determinar tipo de transacción
        const fullText = (body + ' ' + subject).toLowerCase();
        let transactionType = 'compra';
        let isExpense = true;

        // Detectar ingresos (con variantes con/sin tildes)
        if (/(recibiste|ingreso|ingresó|ingresaron|te pagaron|abono|abonó|deposito|depósito)/.test(fullText)) {
            transactionType = 'ingreso';
            isExpense = false;
        } else if (/(compra|pago|pagaste|gasto|gastaste|cargo|cargan)/.test(fullText)) {
            transactionType = 'compra';
            isExpense = true;
        }

        // Extraer descripción
        const description = this.extractDescription(body, subject);

        // Extraer fecha
        const date = this.extractDate(body, emailDate);

        // Validar que el monto no sea cero
        if (amount === 0) {
            console.log('❌ Monto es cero, omitiendo transacción');
            return null;
        }

        // Validar source (debe ser uno de los valores permitidos por BD)
        const validSources = ['Mercado Pago', 'BBVA', 'NU', 'Plata Card'];
        const source = validSources.includes(this.sourceName) ? this.sourceName : 'Mercado Pago';

        // Construir transacción
        const transaction = {
            amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
            description: description,
            date: date,
            source: source, // Solo valores permitidos por BD
            transaction_type: transactionType,
            email_id: emailId,
            email_subject: subject,
            needs_categorization: false, // Mercado Pago generalmente tiene descripción clara
            bank: source
        };

        return this.validateTransaction(transaction) ? transaction : null;
    }

    isTransactionNotification(emailContent) {
        const subject = (emailContent.subject || '').toLowerCase();
        const body = (emailContent.body || '').toLowerCase();
        const text = `${subject} ${body}`;

        // Excluir pagos rechazados, intentos fallidos, estados de cuenta, límites, reportes, etc. (no son transacciones reales)
        const excludeKeywords = [
            'promoción', 'oferta', 'publicidad', 'newsletter', 'sorteo',
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
        ];

        // Verificar exclusiones primero
        const hasExclusion = excludeKeywords.some(keyword => text.includes(keyword));
        if (hasExclusion) {
            console.log('🚫 Email excluido (no es transacción válida):', subject.substring(0, 50));
            return false;
        }

        // Palabras clave de transacción válida
        const transactionKeywords = ['compra', 'pago', 'recibiste', 'pagaste', 'transacción'];
        const hasTransaction = transactionKeywords.some(keyword => text.includes(keyword));

        return hasTransaction;
    }

    extractDescription(body, subject) {
        // Limpiar el contenido HTML primero
        const cleanBody = this.cleanHtmlContent(body || '');
        const cleanSubject = this.cleanSubject(subject || '');
        const combinedText = `${cleanSubject} ${cleanBody}`.trim();

        // Priorizar descripciones del subject (más confiables)
        if (cleanSubject) {
            // Patrones específicos para subjects de Mercado Pago
            const subjectPatterns = [
                /(?:Ingresó|ingresó)\s+dinero\s+a\s+tu\s+cuenta/i,
                /(?:Recibiste|recibiste)\s+dinero/i,
                /(?:Tu\s+transferencia|transferencia)\s+fue\s+enviada/i,
                /(?:Transferencia|transferencia)\s+recibida/i
            ];
            
            for (const pattern of subjectPatterns) {
                const match = cleanSubject.match(pattern);
                if (match) {
                    // Extraer la frase completa del subject
                    const desc = match[0].trim();
                    if (desc.length > 5 && desc.length < 100) {
                        return desc;
                    }
                }
            }
        }

        // Patrones mejorados para contenido real de transacciones
        const patterns = [
            // Ingresos específicos
            /(?:ingresó|ingresaron|ingreso)\s+dinero\s+(?:a\s+tu\s+cuenta|en)/i,
            /(?:recibiste|te\s+enviaron|te\s+pagaron)\s+dinero/i,
            /(?:recibiste|recibieron)\s+\$\s*[\d,]+/i,
            
            // Transferencias
            /(?:tu\s+transferencia|transferencia)\s+fue\s+enviada/i,
            /(?:transferencia|transferiste)\s+(?:a|para)\s+([^.!?\n]{3,50})/i,
            
            // Compras
            /(?:compraste|pago|pagaste)\s+(?:en|a|de)\s+([^.!?\n]{3,50})/i,
            /(?:compra|gasto)\s+(?:en|a|de)\s+([^.!?\n]{3,50})/i,

            // Concepto general
            /concepto[:\s]*([^.!?\n]{3,50})/i,
            /descripción[:\s]*([^.!?\n]{3,50})/i
        ];

        for (const pattern of patterns) {
            const match = combinedText.match(pattern);
            if (match) {
                let desc = (match[1] || match[0]).trim();

                // Validar que no sea CSS o HTML
                if (this.isValidDescription(desc)) {
                    // Limpiar palabras comunes pero mantener estructura
                    desc = desc.replace(/(?:mercado pago|mp|bbva|nu|plata|banco)[:\s]*/gi, '');
                    const normalized = this.normalizeDescription(desc);
                    if (normalized && normalized.length > 5) {
                        return normalized;
                    }
                }
            }
        }

        // Fallback: usar subject si tiene palabras clave de transacción
        if (cleanSubject) {
            const subjectLower = cleanSubject.toLowerCase();
            if (subjectLower.includes('ingresó') || subjectLower.includes('recibiste') || 
                subjectLower.includes('transferencia') || subjectLower.includes('pago') ||
                subjectLower.includes('compra')) {
                return this.normalizeDescription(cleanSubject);
            }
        }

        // Último fallback genérico
        return this.normalizeDescription('Transacción procesada');
    }

    /**
     * Limpia contenido HTML y CSS del body del email
     */
    cleanHtmlContent(text) {
        if (!text) return '';

        // Remover estilos CSS completos
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Remover atributos de estilo y clase
        text = text.replace(/style\s*=\s*["'][^"']*["']/gi, '');
        text = text.replace(/class\s*=\s*["'][^"']*["']/gi, '');
        text = text.replace(/id\s*=\s*["'][^"']*["']/gi, '');

        // Remover todos los tags HTML
        text = text.replace(/<[^>]+>/g, ' ');

        // Remover URLs
        text = text.replace(/https?:\/\/[^\s]+/g, '');

        // Remover patrones CSS comunes
        text = text.replace(/\b(display|font|color|background|margin|padding|border|width|height)\s*:\s*[^;]+;?/gi, '');
        text = text.replace(/\{[^}]*\}/g, ''); // Remover bloques CSS
        text = text.replace(/url\([^)]+\)/gi, ''); // Remover url() de CSS

        // Remover caracteres que no son letras, números, espacios o puntuación básica
        text = text.replace(/[^\w\sáéíóúüñ¿¡.,-]/g, ' ');

        // Normalizar espacios
        text = text.replace(/\s+/g, ' ');

        // Filtrar líneas que parecen código
        const lines = text.split('\n');
        const cleanLines = lines.filter(line => {
            const trimmed = line.trim();
            if (trimmed.length < 3) return false;

            // Filtrar líneas que parecen CSS o código
            const cssPatterns = [
                /display\s*:/i,
                /font-/i,
                /color\s*:/i,
                /background/i,
                /margin/i,
                /padding/i,
                /text-align/i,
                /important/i,
                /px|em|rem/i,
                /#[0-9a-f]{3,6}/i, // Colores hex
                /rgb\(/i,
                /\{|\}/, // Llaves CSS
                /@media/i,
                /@import/i
            ];

            for (const pattern of cssPatterns) {
                if (pattern.test(trimmed)) return false;
            }

            return true;
        });

        return cleanLines.join(' ').trim();
    }

    /**
     * Limpia el subject del email
     */
    cleanSubject(subject) {
        if (!subject) return '';

        // Remover prefijos comunes
        let clean = subject.replace(/^(?:mercado pago|mp|bbva|nu|plata|notificación|alerta)[:\s-]*/gi, '');

        // Remover caracteres especiales
        clean = clean.replace(/[^\w\sáéíóúüñ¿¡.,]/g, ' ');

        return clean.trim();
    }

    /**
     * Valida que una descripción sea válida (no CSS, no HTML)
     */
    isValidDescription(text) {
        if (!text || text.length < 3) return false;

        // No debe contener caracteres de CSS
        if (/[{};:@#]/.test(text)) return false;

        // No debe ser muy largo sin sentido
        if (text.length > 100) return false;

        // Debe contener al menos una letra
        if (!/[a-záéíóúüñ]/i.test(text)) return false;

        // No debe empezar con minúscula seguida de mayúscula (patrón CSS)
        if (/^[a-z][A-Z]/.test(text)) return false;

        return true;
    }
}

/**
 * Parser para emails de BBVA
 */
class BBVAEmailParser extends BaseEmailParser {
    constructor() {
        super('BBVA');
    }

    parse(emailContent) {
        const subject = emailContent.subject || '';
        const body = emailContent.body || '';
        const emailId = emailContent.id || '';
        const emailDate = emailContent.date || '';

        if (!this.isTransactionNotification(emailContent)) {
            return null;
        }

        const amount = this.extractAmount(body || subject);
        if (amount === null) {
            return null;
        }

        // Validar que el monto no sea cero
        if (amount === 0) {
            console.log('❌ Monto es cero, omitiendo transacción BBVA');
            return null;
        }

        const fullText = (body + ' ' + subject).toLowerCase();
        const transactionType = this.determineTransactionType(fullText);
        const isExpense = ['compra', 'retiro', 'transferencia'].includes(transactionType);

        const description = this.extractDescription(body, subject);
        const date = this.extractDate(body, emailDate);

        // Validar source (debe ser uno de los valores permitidos por BD)
        const validSources = ['Mercado Pago', 'BBVA', 'NU', 'Plata Card'];
        const source = validSources.includes(this.sourceName) ? this.sourceName : 'BBVA';

        const transaction = {
            amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
            description: description,
            date: date,
            source: source, // Solo valores permitidos por BD
            transaction_type: transactionType,
            email_id: emailId,
            email_subject: subject,
            needs_categorization: transactionType === 'retiro',
            bank: source
        };

        return this.validateTransaction(transaction) ? transaction : null;
    }

    isTransactionNotification(emailContent) {
        const subject = (emailContent.subject || '').toLowerCase();
        const body = (emailContent.body || '').toLowerCase();
        const text = `${subject} ${body}`;

        // Excluir pagos rechazados, intentos fallidos, estados de cuenta, límites, etc. (no son transacciones reales)
        const excludeKeywords = [
            'promoción', 'oferta', 'publicidad', 'newsletter', 'sorteo',
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
        ];

        const hasExclusion = excludeKeywords.some(keyword => text.includes(keyword));
        if (hasExclusion) {
            console.log('🚫 Email excluido (pago rechazado o intento fallido):', subject.substring(0, 50));
            return false;
        }

        const transactionKeywords = ['cargo', 'abono', 'compra', 'retiro', 'transferencia'];
        const hasTransaction = transactionKeywords.some(keyword => text.includes(keyword));

        return hasTransaction;
    }

    extractDescription(body, subject) {
        // Usar los métodos mejorados de la clase base
        return super.extractDescription(body, subject) || 'Transacción BBVA';
    }
}

/**
 * Parser para emails de NU
 */
class NUEmailParser extends BaseEmailParser {
    constructor() {
        super('NU');
    }

    parse(emailContent) {
        const subject = emailContent.subject || '';
        const body = emailContent.body || '';
        const emailId = emailContent.id || '';
        const emailDate = emailContent.date || '';

        if (!this.isTransactionNotification(emailContent)) {
            return null;
        }

        const amount = this.extractAmount(body || subject);
        if (amount === null) {
            return null;
        }

        // Validar que el monto no sea cero
        if (amount === 0) {
            console.log('❌ Monto es cero, omitiendo transacción NU');
            return null;
        }

        const fullText = (body + ' ' + subject).toLowerCase();
        let transactionType = 'compra';
        let isExpense = true;

        // Detectar ingresos (con variantes con/sin tildes)
        if (/(recibiste|ingreso|ingresó|ingresaron|abono|abonó|deposito|depósito|te pagaron)/.test(fullText)) {
            transactionType = 'ingreso';
            isExpense = false;
        } else if (/(compra|cargo|cargan|pago|pagaste|gasto|gastaste)/.test(fullText)) {
            transactionType = 'compra';
            isExpense = true;
        }

        const description = this.extractDescription(body, subject);
        const date = this.extractDate(body, emailDate);

        // Validar source (debe ser uno de los valores permitidos por BD)
        const validSources = ['Mercado Pago', 'BBVA', 'NU', 'Plata Card'];
        const source = validSources.includes(this.sourceName) ? this.sourceName : 'NU';

        const transaction = {
            amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
            description: description,
            date: date,
            source: source, // Solo valores permitidos por BD
            transaction_type: transactionType,
            email_id: emailId,
            email_subject: subject,
            needs_categorization: false,
            bank: source
        };

        return this.validateTransaction(transaction) ? transaction : null;
    }

    isTransactionNotification(emailContent) {
        const subject = (emailContent.subject || '').toLowerCase();
        const body = (emailContent.body || '').toLowerCase();
        const text = `${subject} ${body}`;

        // Excluir pagos rechazados, intentos fallidos, estados de cuenta, límites, etc. (no son transacciones reales)
        const excludeKeywords = [
            'promoción', 'oferta', 'publicidad', 'newsletter', 'invitación',
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
        ];

        const hasExclusion = excludeKeywords.some(keyword => text.includes(keyword));
        if (hasExclusion) {
            console.log('🚫 Email excluido (pago rechazado o intento fallido):', subject.substring(0, 50));
            return false;
        }

        const transactionKeywords = ['compra', 'pago', 'cargo', 'recibiste', 'transacción'];
        const hasTransaction = transactionKeywords.some(keyword => text.includes(keyword));

        return hasTransaction;
    }

    extractDescription(body, subject) {
        // Usar los métodos mejorados de la clase base
        const result = super.extractDescription(body, subject);
        return result ? result.replace(/(NU|Notificación)[:\s]*/gi, '') : 'Transacción NU';
    }
}

/**
 * Parser para emails de Plata Card
 */
class PlataCardEmailParser extends BaseEmailParser {
    constructor() {
        super('Plata Card');
    }

    parse(emailContent) {
        const subject = emailContent.subject || '';
        const body = emailContent.body || '';
        const emailId = emailContent.id || '';
        const emailDate = emailContent.date || '';

        if (!this.isTransactionNotification(emailContent)) {
            return null;
        }

        const amount = this.extractAmount(body || subject);
        if (amount === null) {
            return null;
        }

        // Validar que el monto no sea cero
        if (amount === 0) {
            console.log('❌ Monto es cero, omitiendo transacción Plata Card');
            return null;
        }

        const fullText = (body + ' ' + subject).toLowerCase();
        let transactionType = 'compra';
        let isExpense = true;

        // Detectar ingresos (con variantes con/sin tildes)
        if (/(recibiste|ingreso|ingresó|ingresaron|abono|abonó|deposito|depósito|te pagaron)/.test(fullText)) {
            transactionType = 'ingreso';
            isExpense = false;
        } else if (/(compra|cargo|cargan|pago|pagaste|gasto|gastaste)/.test(fullText)) {
            transactionType = 'compra';
            isExpense = true;
        }

        const description = this.extractDescription(body, subject);
        const date = this.extractDate(body, emailDate);

        // Validar source (debe ser uno de los valores permitidos por BD)
        const validSources = ['Mercado Pago', 'BBVA', 'NU', 'Plata Card'];
        const source = validSources.includes(this.sourceName) ? this.sourceName : 'Plata Card';

        const transaction = {
            amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
            description: description,
            date: date,
            source: source, // Solo valores permitidos por BD
            transaction_type: transactionType,
            email_id: emailId,
            email_subject: subject,
            needs_categorization: false,
            bank: source
        };

        return this.validateTransaction(transaction) ? transaction : null;
    }

    isTransactionNotification(emailContent) {
        const subject = (emailContent.subject || '').toLowerCase();
        const body = (emailContent.body || '').toLowerCase();
        const text = `${subject} ${body}`;

        // Excluir pagos rechazados, intentos fallidos, estados de cuenta, límites, etc. (no son transacciones reales)
        const excludeKeywords = [
            'promoción', 'oferta', 'publicidad', 'newsletter',
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
        ];

        const hasExclusion = excludeKeywords.some(keyword => text.includes(keyword));
        if (hasExclusion) {
            console.log('🚫 Email excluido (pago rechazado, estado de cuenta o límite):', subject.substring(0, 50));
            return false;
        }

        const transactionKeywords = ['compra', 'pago', 'cargo', 'recibiste', 'transacción'];
        const hasTransaction = transactionKeywords.some(keyword => text.includes(keyword));

        return hasTransaction;
    }

    extractDescription(body, subject) {
        // Usar los métodos mejorados de la clase base
        const result = super.extractDescription(body, subject);
        return result ? result.replace(/(Plata Card|Plata|Notificación)[:\s]*/gi, '') : 'Transacción Plata Card';
    }
}

// Mapa de parsers por dominio (SOLID: Open/Closed - fácil agregar nuevos)
const EMAIL_PARSERS = {
    'mercadopago.com': new MercadoPagoEmailParser(),
    'mercadopago.com.mx': new MercadoPagoEmailParser(),
    'bbva.com': new BBVAEmailParser(),
    'bbva.com.mx': new BBVAEmailParser(),
    'nu.com': new NUEmailParser(),
    'nu.com.mx': new NUEmailParser(),
    'plata.com': new PlataCardEmailParser(),
    'plata.com.mx': new PlataCardEmailParser(),
    'mercadolibre.com.mx': new MercadoPagoEmailParser() // Usar mismo parser que Mercado Pago
};

/**
 * Identifica el parser apropiado basado en el remitente del email
 * @param {Object} emailContent - Contenido del email
 * @returns {BaseEmailParser|null} Parser correspondiente o null
 */
export function identifyEmailParser(emailContent) {
    const fromEmail = (emailContent.from || '').toLowerCase();

    for (const [domain, parser] of Object.entries(EMAIL_PARSERS)) {
        if (fromEmail.includes(domain)) {
            return parser;
        }
    }

    return null;
}

/**
 * Parsea un email usando el parser apropiado
 * @param {Object} emailContent - Contenido del email
 * @returns {Object|null} Datos de transacción o null
 */
export function parseEmailTransaction(emailContent) {
    const parser = identifyEmailParser(emailContent);
    if (!parser) {
        return null;
    }

    return parser.parse(emailContent);
}

// Exportar parsers individuales para uso directo
export { BaseEmailParser, MercadoPagoEmailParser, BBVAEmailParser, NUEmailParser, PlataCardEmailParser };