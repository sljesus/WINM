// js/services/analyzers/EmailAnalyzerFactory.js
// Factory para crear analizadores
// Principio SOLID: Dependency Inversion - depende de abstracciones, no implementaciones

import { RegexEmailAnalyzer } from './RegexEmailAnalyzer.js';
import { OpenAIEmailAnalyzer } from './OpenAIEmailAnalyzer.js';
import { CompositeEmailAnalyzer } from './CompositeEmailAnalyzer.js';

/**
 * Factory para crear instancias de analizadores de email
 * Principio Dependency Inversion: el código depende de abstracciones (IEmailAnalyzer)
 * no de implementaciones concretas
 */
export class EmailAnalyzerFactory {
    /**
     * Crea un analizador basado en la configuración
     * @param {Object} config - Configuración para el analizador
     * @param {boolean} config.useOpenAI - Si usar OpenAI
     * @param {string} config.openaiApiKey - API key de OpenAI
     * @param {boolean} config.useRegex - Si usar regex (default: true)
     * @returns {IEmailAnalyzer} Instancia de analizador
     */
    static create(config = {}) {
        const {
            useOpenAI = false,
            openaiApiKey = null,
            useRegex = true
        } = config;

        const analyzers = [];

        // Siempre incluir regex si está habilitado (base confiable)
        if (useRegex) {
            analyzers.push(new RegexEmailAnalyzer());
        }

        // Agregar OpenAI si está configurado y habilitado
        if (useOpenAI && openaiApiKey) {
            try {
                analyzers.push(new OpenAIEmailAnalyzer(openaiApiKey));
                console.log('✅ EmailAnalyzerFactory: OpenAI analyzer agregado');
            } catch (error) {
                console.warn('⚠️ EmailAnalyzerFactory: Error creando OpenAI analyzer:', error);
            }
        }

        // Estrategia de creación
        if (analyzers.length === 0) {
            throw new Error('Debe habilitar al menos un tipo de analizador (regex u OpenAI)');
        } else if (analyzers.length === 1) {
            // Un solo analizador: devolver directamente
            console.log(`📦 EmailAnalyzerFactory: Creado analizador único: ${analyzers[0].name}`);
            return analyzers[0];
        } else {
            // Múltiples analizadores: usar compuesto
            const composite = new CompositeEmailAnalyzer(analyzers);
            console.log(`📦 EmailAnalyzerFactory: Creado analizador compuesto con ${analyzers.length} analizadores`);
            return composite;
        }
    }

    /**
     * Crea un analizador simple con solo regex
     * @returns {RegexEmailAnalyzer} Analizador regex
     */
    static createRegexOnly() {
        console.log('📦 EmailAnalyzerFactory: Creado analizador regex únicamente');
        return new RegexEmailAnalyzer();
    }

    /**
     * Crea un analizador con OpenAI únicamente
     * @param {string} apiKey - API key de OpenAI
     * @returns {OpenAIEmailAnalyzer} Analizador OpenAI
     */
    static createOpenAIOnly(apiKey) {
        if (!apiKey) {
            throw new Error('API key de OpenAI requerida');
        }
        console.log('📦 EmailAnalyzerFactory: Creado analizador OpenAI únicamente');
        return new OpenAIEmailAnalyzer(apiKey);
    }

    /**
     * Crea un analizador compuesto personalizado
     * @param {Array<IEmailAnalyzer>} analyzers - Array de analizadores
     * @returns {CompositeEmailAnalyzer} Analizador compuesto
     */
    static createComposite(analyzers = []) {
        if (!Array.isArray(analyzers) || analyzers.length === 0) {
            throw new Error('Debe proporcionar al menos un analizador');
        }

        // Validar que todos implementen IEmailAnalyzer
        for (const analyzer of analyzers) {
            if (!(analyzer instanceof IEmailAnalyzer)) {
                throw new Error('Todos los analizadores deben implementar IEmailAnalyzer');
            }
        }

        console.log(`📦 EmailAnalyzerFactory: Creado analizador compuesto personalizado con ${analyzers.length} analizadores`);
        return new CompositeEmailAnalyzer(analyzers);
    }
}