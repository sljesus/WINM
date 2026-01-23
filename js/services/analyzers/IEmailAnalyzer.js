// js/services/analyzers/IEmailAnalyzer.js
// Interfaz base para analizadores de email
// Principio SOLID: Interface Segregation - solo métodos necesarios

/**
 * Interfaz para analizadores de email
 * Define el contrato mínimo para cualquier analizador de transacciones
 */
export class IEmailAnalyzer {
    /**
     * Analiza contenido de email y extrae datos de transacción
     * @param {Object} emailContent - Contenido del email con subject, body, id, date, from
     * @param {Object} [options] - Opciones (ej. { categories } para IA). Opcional.
     * @returns {Promise<Object|null>} Datos de transacción estructurados o null si no es transacción
     *
     * Estructura esperada del resultado:
     * {
     *   amount: number, // Positivo para ingresos, negativo para gastos
     *   description: string, // Descripción clara de la transacción
     *   date: string, // Fecha en formato ISO
     *   source: string, // Fuente (Mercado Pago, BBVA, etc.)
     *   transaction_type: string, // compra, ingreso, retiro, transferencia, otro
     *   email_id: string, // ID del email
     *   email_subject: string, // Asunto del email
     *   needs_categorization: boolean, // Si necesita categorización manual
     *   bank: string, // Nombre del banco/servicio
     *   confidence: number, // Confianza en el análisis (0-1)
     *   analyzed_by_ai: boolean // Si fue analizado por IA
     * }
     */
    async analyzeEmail(emailContent, options = {}) {
        throw new Error('Método analyzeEmail debe ser implementado por subclases');
    }
}