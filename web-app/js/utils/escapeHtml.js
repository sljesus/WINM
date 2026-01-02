// Utilidades de seguridad XSS
// Escapa HTML para prevenir ataques XSS

/**
 * Escapa caracteres HTML especiales para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado seguro para HTML
 */
export function escapeHtml(text) {
    if (text == null) {
        return '';
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escapa atributos HTML
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado seguro para atributos
 */
export function escapeAttribute(text) {
    if (text == null) {
        return '';
    }
    
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
