// Servicio de importación de transacciones desde Gmail
// Principio SOLID: Single Responsibility - Solo maneja importación de transacciones
// Principio KISS: Simple y directo

import { searchBankEmails, getEmailContent } from './gmailAPIService.js';
import { EmailAnalyzerFactory } from './analyzers/EmailAnalyzerFactory.js';
import { createTransaction, getCategories } from './transactionService.js';
import { existsByEmailId } from './repositories/transactionRepository.js';

/**
 * Servicio para importar transacciones desde Gmail
 * Maneja el flujo completo: buscar emails → parsear → guardar
 */
class TransactionImportService {
    constructor() {
        this.isImporting = false;
        this.progressCallback = null;
        this.errorCallback = null;
        this.emailAnalyzer = null;
        this._initializeAnalyzer();
    }

    /**
     * Inicializa el analizador de emails basado en configuración
     */
    _initializeAnalyzer() {
        try {
            // Obtener configuración de IA (KISS: configuración simple)
            const aiConfig = window.CONFIG?.ai || {
                useOpenAI: false,
                openaiApiKey: null,
                useRegex: true
            };

            this.emailAnalyzer = EmailAnalyzerFactory.create(aiConfig);
            console.log('✅ TransactionImportService: Analizador de emails inicializado');
        } catch (error) {
            console.warn('⚠️ TransactionImportService: Error inicializando analizador, usando regex únicamente:', error);
            this.emailAnalyzer = EmailAnalyzerFactory.createRegexOnly();
        }
    }

    /**
     * Configura callbacks para progreso y errores
     * @param {Function} progressCallback - Callback para reportar progreso
     * @param {Function} errorCallback - Callback para reportar errores
     */
    setCallbacks(progressCallback, errorCallback) {
        this.progressCallback = progressCallback;
        this.errorCallback = errorCallback;
    }

    /**
     * Reporta progreso de la importación
     * @param {string} message - Mensaje de progreso
     * @param {Object} data - Datos adicionales
     */
    reportProgress(message, data = {}) {
        if (this.progressCallback) {
            this.progressCallback(message, data);
        }
        console.log(`📊 ${message}`, data);
    }

    /**
     * Reporta error durante la importación
     * @param {string} message - Mensaje de error
     * @param {Error} error - Error original
     */
    reportError(message, error = null) {
        if (this.errorCallback) {
            this.errorCallback(message, error);
        }
        console.error(`❌ ${message}`, error);
    }

    /**
     * Verifica si ya hay una importación en progreso
     * @returns {boolean} True si está importando
     */
    isCurrentlyImporting() {
        return this.isImporting;
    }

    /**
     * Importa transacciones desde Gmail
     * Flujo completo: buscar emails → parsear → guardar
     * @param {Object} options - Opciones de importación
     * @returns {Promise<Object>} Resultado de la importación
     */
    async importTransactions(options = {}) {
        if (this.isImporting) {
            throw new Error('Ya hay una importación en progreso');
        }

        this.isImporting = true;

        try {
            const result = await this._performImport(options);
            this.reportProgress('Importación completada exitosamente', result);
            return result;
        } catch (error) {
            this.reportError('Error durante la importación', error);
            throw error;
        } finally {
            this.isImporting = false;
        }
    }

    /**
     * Ejecuta la importación real
     * @param {Object} options - Opciones
     * @returns {Promise<Object>} Resultado
     */
    async _performImport(options) {
        const {
            daysBack = 7,
            maxEmails = 50,
            skipDuplicates = true
        } = options;

        this.reportProgress(`Iniciando importación de transacciones (últimos ${daysBack} días)`);

        // 1. Buscar emails de bancos
        this.reportProgress('Buscando emails de bancos...');
        const emails = await this._searchBankEmails(daysBack, maxEmails);

        if (emails.length === 0) {
            return {
                success: true,
                emailsFound: 0,
                transactionsImported: 0,
                message: 'No se encontraron emails de bancos'
            };
        }

        this.reportProgress(`Encontrados ${emails.length} emails de bancos`);

        // 2. Categorías para IA (orquestador las obtiene; analizador no accede a BD)
        let categories = [];
        try {
            categories = await getCategories();
        } catch (e) {
            console.warn('⚠️ No se pudieron cargar categorías para IA:', e);
        }

        // 3. Procesar emails y extraer transacciones
        const transactions = await this._processEmails(emails, skipDuplicates, categories);

        // 4. Guardar en BD vía repositorio (createTransaction usa transactionRepository)

        const savedTransactions = await this._saveTransactions(transactions);

        return {
            success: true,
            emailsFound: emails.length,
            transactionsFound: transactions.length,
            transactionsImported: savedTransactions.length,
            skippedDuplicates: transactions.length - savedTransactions.length
        };
    }

    /**
     * Busca emails de bancos en Gmail
     * @param {number} daysBack - Días hacia atrás
     * @param {number} maxEmails - Máximo de emails
     * @returns {Promise<Array>} Lista de emails
     */
    async _searchBankEmails(daysBack, maxEmails) {
        try {
            // Query para buscar emails de bancos (igual que Python version)
            const query = 'from:@bbva.com OR from:@bbva.com.mx OR from:@mercadopago.com OR from:@mercadopago.com.mx OR from:@nu.com.mx OR from:@nu.com OR from:@plata.com.mx OR from:@plata.com OR from:@mercadolibre.com.mx newer_than:' + daysBack + 'd';

            const searchResult = await searchBankEmails(query, maxEmails);
            return searchResult.messages || [];
        } catch (error) {
            this.reportError('Error buscando emails de bancos', error);
            return [];
        }
    }

    /**
     * Procesa emails y extrae transacciones
     * @param {Array} emailIds - IDs de emails
     * @param {boolean} skipDuplicates - Si omitir duplicados
     * @param {Array} categories - Categorías para IA (inyectadas; sin acceso a BD en analizador)
     * @returns {Promise<Array>} Lista de transacciones
     */
    async _processEmails(emailIds, skipDuplicates, categories = []) {
        const transactions = [];

        for (const emailInfo of emailIds) {
            try {
                const emailContent = await getEmailContent(emailInfo.id);
                if (!emailContent?.body) {
                    this.reportProgress(`Email ${emailInfo.id} sin contenido, omitiendo`);
                    continue;
                }

                const transaction = await this.emailAnalyzer.analyzeEmail(emailContent, { categories });

                if (transaction) {
                    if (skipDuplicates && (await existsByEmailId(transaction.email_id))) {
                        this.reportProgress(`Transacción duplicada omitida: ${transaction.description}`);
                        continue;
                    }
                    transactions.push(transaction);
                    const analyzerInfo = transaction.analyzer_used ? ` (${transaction.analyzer_used})` : '';
                    this.reportProgress(`Transacción extraída${analyzerInfo}: ${transaction.description} - $${Math.abs(transaction.amount).toFixed(2)}`);
                }
            } catch (error) {
                this.reportError(`Error procesando email ${emailInfo.id}`, error);
            }
        }

        return transactions;
    }

    /**
     * Guarda transacciones en la base de datos
     * @param {Array} transactions - Transacciones a guardar
     * @returns {Promise<Array>} Transacciones guardadas exitosamente
     */
    async _saveTransactions(transactions) {
        const savedTransactions = [];
        let saved = 0;

        for (const transaction of transactions) {
            try {
                saved++;
                this.reportProgress(`Guardando transacción ${saved}/${transactions.length}...`);

                // Filtrar solo campos que existen en la base de datos
                const transactionData = {
                    amount: transaction.amount,
                    description: transaction.description,
                    date: transaction.date,
                    source: transaction.source,
                    transaction_type: transaction.transaction_type,
                    email_id: transaction.email_id,
                    email_subject: transaction.email_subject,
                    needs_categorization: transaction.needs_categorization,
                    bank: transaction.bank
                    // Removidos: analyzed_by_ai, confidence, analyzer_used (no existen en BD)
                };

                const savedTransaction = await createTransaction(transactionData);
                savedTransactions.push(savedTransaction);

                this.reportProgress(`Transacción guardada: ${transaction.description}`);

            } catch (error) {
                this.reportError(`Error guardando transacción: ${transaction.description}`, error);
                continue;
            }
        }

        return savedTransactions;
    }
}

// Instancia singleton del servicio (KISS)
const transactionImportService = new TransactionImportService();

/**
 * Importa transacciones desde Gmail
 * Función principal para uso externo
 * @param {Object} options - Opciones de importación
 * @param {Function} progressCallback - Callback para progreso
 * @param {Function} errorCallback - Callback para errores
 * @returns {Promise<Object>} Resultado de la importación
 */
export async function importTransactionsFromGmail(options = {}, progressCallback = null, errorCallback = null) {
    transactionImportService.setCallbacks(progressCallback, errorCallback);
    return await transactionImportService.importTransactions(options);
}

/**
 * Verifica si hay una importación en progreso
 * @returns {boolean} True si está importando
 */
export function isImportInProgress() {
    return transactionImportService.isCurrentlyImporting();
}

// Exportar clase para uso avanzado
export { TransactionImportService };