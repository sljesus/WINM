// Utilidades de formateo de moneda para México
// Usa Intl.NumberFormat con locale es-MX y moneda MXN

const LOCALE = 'es-MX';
const CURRENCY = 'MXN';

/**
 * Formatea un monto como moneda mexicana
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado (ej: $1,234.56)
 */
export function formatCurrency(amount) {
    try {
        return new Intl.NumberFormat(LOCALE, {
            style: 'currency',
            currency: CURRENCY
        }).format(amount);
    } catch (error) {
        console.error('Error formateando moneda:', error);
        return `$${amount.toFixed(2)}`;
    }
}

/**
 * Formatea un monto en formato corto (K, M)
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado corto (ej: $1.2K, $1.5M)
 */
export function formatCurrencyShort(amount) {
    if (Math.abs(amount) >= 1000000) {
        return formatCurrency(amount / 1000000) + 'M';
    } else if (Math.abs(amount) >= 1000) {
        return formatCurrency(amount / 1000) + 'K';
    }
    return formatCurrency(amount);
}

/**
 * Parsea un string de moneda a número
 * @param {string} value - String con formato de moneda
 * @returns {number} Número parseado
 */
export function parseCurrency(value) {
    if (typeof value === 'number') {
        return value;
    }
    
    // Remover símbolos y espacios
    const cleaned = value.toString()
        .replace(/[$,\s]/g, '')
        .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formatea un monto con signo positivo/negativo
 * @param {number} amount - Monto a formatear
 * @param {boolean} showSign - Mostrar signo + para positivos
 * @returns {string} Monto formateado con signo
 */
export function formatCurrencyWithSign(amount, showSign = false) {
    const formatted = formatCurrency(Math.abs(amount));
    if (amount >= 0 && showSign) {
        return `+${formatted}`;
    } else if (amount < 0) {
        return `-${formatted}`;
    }
    return formatted;
}
