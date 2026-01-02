// Utilidades de formateo de fechas para México
// Usa Intl.DateTimeFormat con timezone de México

const MEXICO_TIMEZONE = 'America/Mexico_City';
const LOCALE = 'es-MX';

/**
 * Formatea una fecha con opciones personalizadas
 * @param {Date|string} date - Fecha a formatear
 * @param {Object} options - Opciones de formato (dateStyle, timeStyle, year, month, day, etc.)
 * @returns {string} Fecha formateada
 */
export function formatDate(date, options = {}) {
    // Si se pasan opciones individuales (year, month, day), no usar dateStyle
    const hasIndividualOptions = options.year || options.month || options.day || options.hour || options.minute || options.second;
    const hasStyleOptions = options.dateStyle || options.timeStyle;
    
    let defaultOptions = {
        timeZone: MEXICO_TIMEZONE
    };
    
    // Solo agregar dateStyle si no hay opciones individuales
    if (!hasIndividualOptions && !hasStyleOptions) {
        defaultOptions.dateStyle = 'long';
    }
    
    // Combinar con opciones pasadas
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        return new Intl.DateTimeFormat(LOCALE, finalOptions).format(new Date(date));
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return new Date(date).toLocaleDateString(LOCALE);
    }
}

/**
 * Formatea fecha y hora completa
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada
 */
export function formatDateTime(date) {
    return formatDate(date, {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

/**
 * Formatea fecha en formato corto (DD/MM/YYYY)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha corta formateada
 */
export function formatDateShort(date) {
    return formatDate(date, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Obtiene el inicio del mes para una fecha dada
 * @param {Date} date - Fecha de referencia (default: hoy)
 * @returns {Date} Fecha de inicio del mes
 */
export function getMonthStart(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
}

/**
 * Obtiene el fin del mes para una fecha dada
 * @param {Date} date - Fecha de referencia (default: hoy)
 * @returns {Date} Fecha de fin del mes
 */
export function getMonthEnd(date = new Date()) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Compara si dos fechas están en el mismo mes
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {boolean} True si están en el mismo mes
 */
export function isSameMonth(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() && 
           d1.getMonth() === d2.getMonth();
}

/**
 * Obtiene el nombre del mes en español
 * @param {Date|string} date - Fecha
 * @returns {string} Nombre del mes
 */
export function getMonthName(date) {
    return formatDate(date, { month: 'long' });
}

/**
 * Obtiene el año de una fecha
 * @param {Date|string} date - Fecha
 * @returns {number} Año
 */
export function getYear(date) {
    return new Date(date).getFullYear();
}
