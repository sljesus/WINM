// Servicio de importación de transacciones desde Gmail
// Principio SOLID: Single Responsibility - Solo maneja importación de transacciones
// Principio KISS: Simple y directo

import { searchBankEmails, getEmailContent } from './gmailAPIService.js';
import { parseEmailTransaction } from '../parsers/emailParsers.js';
import { createTransaction } from './transactionService.js';

/**
 * Servicio para importar transacciones desde Gmail
 * Maneja el flujo completo: buscar emails → parsear → guardar
 */
class TransactionImportService {
    constructor() {
        this.isImporting = false;
        this.progressCallback = null;
        this.errorCallback = null;
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

        // 2. Procesar emails y extraer transacciones
        const transactions = await this._processEmails(emails, skipDuplicates);

        // 3. Guardar transacciones en BD
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
     * @returns {Promise<Array>} Lista de transacciones
     */
    async _processEmails(emailIds, skipDuplicates) {
        const transactions = [];

        for (const emailInfo of emailIds) {
            try {
                // Obtener contenido completo del email
                const emailContent = await getEmailContent(emailInfo.id);

                if (!emailContent || !emailContent.body) {
                    this.reportProgress(`Email ${emailInfo.id} sin contenido, omitiendo`);
                    continue;
                }

                // Parsear transacción
                const transaction = parseEmailTransaction(emailContent);

                if (transaction) {
                    // Verificar duplicados si es necesario
                    if (skipDuplicates && await this._isDuplicateTransaction(transaction)) {
                        this.reportProgress(`Transacción duplicada omitida: ${transaction.description}`);
                        continue;
                    }

                    transactions.push(transaction);
                    this.reportProgress(`Transacción extraída: ${transaction.description} - $${Math.abs(transaction.amount).toFixed(2)}`);
                } else {
                    this.reportProgress(`No se pudo extraer transacción del email ${emailInfo.id}`);
                }

            } catch (error) {
                this.reportError(`Error procesando email ${emailInfo.id}`, error);
                continue;
            }
        }

        return transactions;
    }

    /**
     * Verifica si una transacción ya existe (basado en email_id)
     * @param {Object} transaction - Transacción a verificar
     * @returns {Promise<boolean>} True si es duplicada
     */
    async _isDuplicateTransaction(transaction) {
        try {
            // Verificar si ya existe una transacción con el mismo email_id
            // Esto es una verificación simple - en producción podría ser más compleja
            const existing = await this._checkExistingTransaction(transaction.email_id);
            return existing !== null;
        } catch (error) {
            // Si hay error verificando, asumir que no es duplicada
            return false;
        }
    }

    /**
     * Verifica si existe una transacción con el mismo email_id
     * @param {string} emailId - ID del email
     * @returns {Promise<Object|null>} Transacción existente o null
     */
    async _checkExistingTransaction(emailId) {
        try {
            // Importar dinámicamente para evitar dependencias circulares
            const { getSupabaseClient } = await import('./supabaseService.js');

            const client = getSupabaseClient();
            const { data: { user } } = await client.auth.getUser();

            if (!user) {
                return null;
            }

            const { data, error } = await client
                .from('transactions')
                .select('id, email_id')
                .eq('user_id', user.id)
                .eq('email_id', emailId)
                .single();

            if (error) {
                // Si no encuentra la transacción, error.code será 'PGRST116'
                if (error.code === 'PGRST116') {
                    return null; // No existe
                }
                console.error('Error verificando transacción existente:', error);
                return null;
            }

            return data; // Existe
        } catch (error) {
            console.error('Error en _checkExistingTransaction:', error);
            return null;
        }
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

                // Agregar campos requeridos para Supabase
                const transactionData = {
                    ...transaction,
                    // Los campos ya están en el formato correcto del parser
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