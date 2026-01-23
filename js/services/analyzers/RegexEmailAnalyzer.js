// js/services/analyzers/RegexEmailAnalyzer.js
// Analizador que usa expresiones regulares
// Principio SOLID: Single Responsibility - solo análisis con regex

import { IEmailAnalyzer } from './IEmailAnalyzer.js';
import { parseEmailTransaction } from '../../parsers/emailParsers.js';

/**
 * Analizador de emails usando expresiones regulares
 * Responsabilidad única: delegar al parser regex existente
 */
export class RegexEmailAnalyzer extends IEmailAnalyzer {
    constructor() {
        super();
        this.name = 'RegexEmailAnalyzer';
    }

    /**
     * Analiza email usando el parser regex existente
     * @param {Object} emailContent - Contenido del email
     * @returns {Promise<Object|null>} Transacción extraída o null
     */
    async analyzeEmail(emailContent) {
        try {
            console.log(`🔍 ${this.name}: Analizando email ${emailContent.id}`);

            // Delegar al parser regex existente
            const transaction = parseEmailTransaction(emailContent);

            if (transaction) {
                // Agregar metadatos del análisis
                transaction.confidence = 0.9; // Alta confianza para regex probado
                transaction.analyzed_by_ai = false;
                transaction.analyzer_used = this.name;

                // Log removido - se muestra en el progreso de importación
                return transaction;
            } else {
                // No loggear cuando no se encuentra transacción (es normal)
                return null;
            }

        } catch (error) {
            console.error(`❌ ${this.name}: Error analizando email:`, error);
            return null;
        }
    }
}