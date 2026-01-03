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
        // Patrones comunes: $1,234.56, 1234.56, 1,234.56 MXN, etc.
        const patterns = [
            /\$[\s]*([\d,]+\.?\d*)/,  // $1,234.56
            /([\d,]+\.?\d*)[\s]*(?:MXN|pesos|peso)/i,  // 1234.56 MXN
            /([\d,]+\.?\d*)/  // 1234.56
        ];

        for (const pattern of patterns) {
            const match = text.replace(/,/g, '').match(pattern);
            if (match) {
                const amount = parseFloat(match[1]);
                if (!isNaN(amount)) {
                    return amount;
                }
            }
        }

        return null;
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
        const validSources = ['Mercado Pago', 'NU', 'Plata Card', 'BBVA'];
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

        if (/(recibiste|ingreso|te pagaron)/.test(fullText)) {
            transactionType = 'ingreso';
            isExpense = false;
        } else if (/(compra|pago|pagaste)/.test(fullText)) {
            transactionType = 'compra';
            isExpense = true;
        }

        // Extraer descripción
        const description = this.extractDescription(body, subject);

        // Extraer fecha
        const date = this.extractDate(body, emailDate);

        // Construir transacción
        const transaction = {
            amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
            description: description,
            date: date,
            source: this.sourceName,
            transaction_type: transactionType,
            email_id: emailId,
            email_subject: subject,
            needs_categorization: false, // Mercado Pago generalmente tiene descripción clara
            bank: this.sourceName
        };

        return this.validateTransaction(transaction) ? transaction : null;
    }

    isTransactionNotification(emailContent) {
        const subject = (emailContent.subject || '').toLowerCase();
        const body = (emailContent.body || '').toLowerCase();
        const text = `${subject} ${body}`;

        // Palabras clave de transacción
        const transactionKeywords = ['compra', 'pago', 'recibiste', 'pagaste', 'transacción'];
        const excludeKeywords = ['promoción', 'oferta', 'publicidad', 'newsletter', 'sorteo'];

        const hasTransaction = transactionKeywords.some(keyword => text.includes(keyword));
        const hasExclusion = excludeKeywords.some(keyword => text.includes(keyword));

        return hasTransaction && !hasExclusion;
    }

    extractDescription(body, subject) {
        const text = body || subject;

        // Patrones comunes en emails de Mercado Pago
        const patterns = [
            /(?:Compra|Pago)\s+(?:en|a|de)\s+([^\n.]+)/i,
            /Concepto[:\s]+([^\n.]+)/i,
            /Descripción[:\s]+([^\n.]+)/i,
            /([A-Z][^\.\n]{10,50})/  // Frase que empieza con mayúscula
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let desc = match[1];
                // Limpiar descripción
                desc = desc.replace(/(Mercado Pago|MP)[:\s]*/gi, '');
                return this.normalizeDescription(desc);
            }
        }

        // Fallback
        if (subject) {
            let desc = subject.replace(/^(Mercado Pago|MP|Notificación)[:\s]*/gi, '');
            return this.normalizeDescription(desc);
        }

        return this.normalizeDescription(text.substring(0, 100) || 'Transacción Mercado Pago');
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

        const fullText = (body + ' ' + subject).toLowerCase();
        const transactionType = this.determineTransactionType(fullText);
        const isExpense = ['compra', 'retiro', 'transferencia'].includes(transactionType);

        const description = this.extractDescription(body, subject);
        const date = this.extractDate(body, emailDate);

        const transaction = {
            amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
            description: description,
            date: date,
            source: this.sourceName,
            transaction_type: transactionType,
            email_id: emailId,
            email_subject: subject,
            needs_categorization: transactionType === 'retiro',
            bank: this.sourceName
        };

        return this.validateTransaction(transaction) ? transaction : null;
    }

    isTransactionNotification(emailContent) {
        const subject = (emailContent.subject || '').toLowerCase();
        const body = (emailContent.body || '').toLowerCase();
        const text = `${subject} ${body}`;

        const transactionKeywords = ['cargo', 'abono', 'compra', 'retiro', 'transferencia'];
        const excludeKeywords = ['estado de cuenta', 'promoción', 'oferta'];

        const hasTransaction = transactionKeywords.some(keyword => text.includes(keyword));
        const hasExclusion = excludeKeywords.some(keyword => text.includes(keyword));

        return hasTransaction && !hasExclusion;
    }

    extractDescription(body, subject) {
        const text = body || subject;

        // Patrones para BBVA
        const patterns = [
            /(?:Cargo|Compra|Pago)\s+(?:en|a)\s+([^\n.]+)/i,
            /Concepto[:\s]+([^\n.]+)/i,
            /([A-Z][^\.\n]{10,50})/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return this.normalizeDescription(match[1]);
            }
        }

        return this.normalizeDescription(text.substring(0, 100) || 'Transacción BBVA');
    }
}

// Mapa de parsers por dominio (SOLID: Open/Closed - fácil agregar nuevos)
const EMAIL_PARSERS = {
    'mercadopago.com': new MercadoPagoEmailParser(),
    'bbva.com': new BBVAEmailParser(),
    'bbva.com.mx': new BBVAEmailParser()
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
export { BaseEmailParser, MercadoPagoEmailParser, BBVAEmailParser };