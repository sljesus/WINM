// js/services/analyzers/CompositeEmailAnalyzer.js
// Analizador compuesto que combina múltiples estrategias
// Principio SOLID: Open/Closed - extensible sin modificar código existente

import { IEmailAnalyzer } from './IEmailAnalyzer.js';

/**
 * Analizador compuesto que combina múltiples estrategias de análisis
 * Principio Open/Closed: se puede extender agregando nuevos analizadores sin modificar este código
 */
export class CompositeEmailAnalyzer extends IEmailAnalyzer {
    constructor(analyzers = []) {
        super();
        this.name = 'CompositeEmailAnalyzer';
        this.analyzers = analyzers; // Array de IEmailAnalyzer
    }

    /**
     * Agrega un nuevo analizador a la cadena
     * @param {IEmailAnalyzer} analyzer - Analizador que implementar IEmailAnalyzer
     */
    addAnalyzer(analyzer) {
        if (analyzer instanceof IEmailAnalyzer) {
            this.analyzers.push(analyzer);
            console.log(`➕ ${this.name}: Agregado analizador ${analyzer.name || analyzer.constructor.name}`);
        } else {
            throw new Error('El analizador debe implementar IEmailAnalyzer');
        }
    }

    /**
     * Remueve un analizador de la cadena
     * @param {IEmailAnalyzer} analyzer - Analizador a remover
     */
    removeAnalyzer(analyzer) {
        const index = this.analyzers.indexOf(analyzer);
        if (index > -1) {
            this.analyzers.splice(index, 1);
            console.log(`➖ ${this.name}: Removido analizador ${analyzer.name || analyzer.constructor.name}`);
        }
    }

    /**
     * Analiza email intentando cada analizador en orden
     * Estrategia: devuelve el primer resultado válido encontrado
     * @param {Object} emailContent - Contenido del email
     * @returns {Promise<Object|null>} Primer resultado válido o null
     */
    async analyzeEmail(emailContent, options = {}) {
        for (let i = 0; i < this.analyzers.length; i++) {
            const analyzer = this.analyzers[i];
            const analyzerName = analyzer.name || analyzer.constructor.name;

            try {
                const result = await analyzer.analyzeEmail(emailContent, options);

                if (result) {
                    // Solo log si es exitoso (importante para debugging)
                    // Agregar metadato del analizador compuesto
                    result.analyzer_chain = this._getAnalyzerChain(i);
                    return result;
                }
                // No loggear cuando un analizador no encuentra transacción (es normal)

            } catch (error) {
                // Solo loggear errores reales, no cuando simplemente no encuentra transacción
                console.error(`❌ [ERROR] ${this.name}: ${analyzerName} falló:`, error);
                // Continuar con el siguiente analizador
                continue;
            }
        }

        // No loggear cuando ningún analizador encuentra transacción (es normal para emails no transaccionales)
        return null;
    }

    /**
     * Obtiene la cadena de analizadores usados hasta el exitoso
     * @param {number} successfulIndex - Índice del analizador que funcionó
     * @returns {string} Cadena descriptiva
     */
    _getAnalyzerChain(successfulIndex) {
        const names = this.analyzers.map((a, i) => {
            const name = a.name || a.constructor.name;
            return i === successfulIndex ? `✅${name}` : `❌${name}`;
        });
        return names.join(' → ');
    }

    /**
     * Obtiene estadísticas de los analizadores
     * @returns {Object} Estadísticas de uso
     */
    getStats() {
        return {
            totalAnalyzers: this.analyzers.length,
            analyzerNames: this.analyzers.map(a => a.name || a.constructor.name),
            analyzerTypes: this.analyzers.map(a => a.constructor.name)
        };
    }
}