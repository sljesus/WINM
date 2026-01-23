// Servicio de Transacciones
// Principio SOLID: Responsabilidad única - Lógica de negocio de transacciones
// Actualizado para GitHub Pages - v3 (2025-01-27)

import { getSupabaseClient } from './supabaseService.js';
import { getMonthStart, getMonthEnd } from '../utils/dateFormatter.js';

/**
 * Carga transacciones con filtros opcionales
 * @param {Object} filters - Filtros de búsqueda
 * @param {Date|string} filters.startDate - Fecha de inicio
 * @param {Date|string} filters.endDate - Fecha de fin
 * @param {string} filters.categoryId - ID de categoría
 * @param {string} filters.source - Fuente (BBVA, Mercado Pago, etc.)
 * @param {string} filters.transactionType - Tipo de transacción
 * @param {number} filters.limit - Límite de resultados (default: 50)
 * @param {number} filters.offset - Offset para paginación (default: 0)
 * @returns {Promise<Array>} Array de transacciones
 */
export async function loadTransactions(filters = {}) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        let query = client
            .from('transactions')
            .select('*, categories(name, icon, color)')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        // Aplicar filtros
        if (filters.startDate) {
            query = query.gte('date', filters.startDate);
        }

        if (filters.endDate) {
            query = query.lte('date', filters.endDate);
        }

        if (filters.categoryId) {
            query = query.eq('category_id', filters.categoryId);
        }

        if (filters.source) {
            query = query.eq('source', filters.source);
        }

        if (filters.transactionType) {
            query = query.eq('transaction_type', filters.transactionType);
        }

        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error cargando transacciones:', error);
        throw error;
    }
}

/**
 * Calcula estadísticas de transacciones
 * @param {Array} transactions - Array de transacciones
 * @returns {Object} Objeto con estadísticas
 */
export function calculateStats(transactions) {
    if (!transactions || transactions.length === 0) {
        return {
            total: 0,
            totalIncome: 0,
            totalExpenses: 0,
            count: 0,
            monthTotal: 0,
            monthIncome: 0,
            monthExpenses: 0,
            monthCount: 0
        };
    }

    const now = new Date();
    const monthStart = getMonthStart(now);
    const monthEnd = getMonthEnd(now);

    // Estadísticas totales
    const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalIncome = transactions
        .filter(t => parseFloat(t.amount || 0) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = transactions
        .filter(t => parseFloat(t.amount || 0) < 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Estadísticas del mes actual
    const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    const monthTotal = monthTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const monthIncome = monthTransactions
        .filter(t => parseFloat(t.amount || 0) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const monthExpenses = monthTransactions
        .filter(t => parseFloat(t.amount || 0) < 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
        total,
        totalIncome,
        totalExpenses,
        count: transactions.length,
        monthTotal,
        monthIncome,
        monthExpenses,
        monthCount: monthTransactions.length
    };
}

/**
 * Filtra transacciones por mes
 * @param {Array} transactions - Array de transacciones
 * @param {Date|string} date - Fecha de referencia para el mes
 * @returns {Array} Transacciones del mes especificado
 */
export function getTransactionsByMonth(transactions, date) {
    const monthStart = getMonthStart(date);
    const monthEnd = getMonthEnd(date);

    return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
}

/**
 * Filtra transacciones por categoría
 * @param {Array} transactions - Array de transacciones
 * @param {string} categoryId - ID de categoría
 * @returns {Array} Transacciones de la categoría especificada
 */
export function getTransactionsByCategory(transactions, categoryId) {
    return transactions.filter(t => t.category_id === categoryId);
}

/**
 * Busca transacciones por texto en descripción
 * @param {Array} transactions - Array de transacciones
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} Transacciones que coinciden con la búsqueda
 */
export function searchTransactions(transactions, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return transactions;
    }

    const term = searchTerm.toLowerCase().trim();
    return transactions.filter(t => {
        const description = (t.description || '').toLowerCase();
        return description.includes(term);
    });
}

/**
 * Actualiza la categoría de una transacción
 * @param {string} transactionId - ID de la transacción
 * @param {string} categoryId - ID de la categoría
 * @param {string|null} expenseDetail - Detalle del gasto (opcional)
 * @returns {Promise<Object>} Transacción actualizada
 */
export async function updateCategory(transactionId, categoryId, expenseDetail = null) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Construir objeto de actualización
        const updateData = {
            category_id: categoryId,
            needs_categorization: false
        };

        // Agregar expense_detail solo si se proporciona
        if (expenseDetail) {
            updateData.expense_detail = expenseDetail;
        }

        const { data, error } = await client
            .from('transactions')
            .update(updateData)
            .eq('id', transactionId)
            .eq('user_id', user.id)
            .select('*, categories(name, icon, color)')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        throw error;
    }
}

/**
 * Obtiene todas las categorías disponibles (sistema + personalizadas)
 * @returns {Promise<Array>} Array de categorías
 */
export async function getCategories() {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Obtener categorías del sistema y del usuario
        const { data, error } = await client
            .from('categories')
            .select('id, name, icon, color, is_system')
            .or(`is_system.eq.true,user_id.eq.${user.id}`)
            .order('is_system', { ascending: false })
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        throw error;
    }
}

/**
 * Crea una nueva transacción
 * @param {Object} transactionData - Datos de la transacción
 * @returns {Promise<Object>} Transacción creada
 */
async function createTransaction(transactionData) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();

        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Agregar user_id a los datos
        const dataToInsert = {
            ...transactionData,
            user_id: user.id
        };

        const { data, error } = await client
            .from('transactions')
            .insert(dataToInsert)
            .select('*, categories(name, icon, color)')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creando transacción:', error);
        throw error;
    }
}

/**
 * Obtiene las fuentes/bancos únicos del usuario
 * @returns {Promise<Array>} Array de fuentes únicas
 */
export async function getSources() {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();

        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        const { data, error } = await client
            .from('transactions')
            .select('source')
            .eq('user_id', user.id)
            .not('source', 'is', null);

        if (error) throw error;

        // Obtener valores únicos
        const uniqueSources = [...new Set((data || []).map(t => t.source))];
        return uniqueSources.sort();
    } catch (error) {
        console.error('Error obteniendo fuentes:', error);
        throw error;
    }
}

/**
 * Elimina una transacción
 * @param {string} transactionId - ID de la transacción
 * @returns {Promise<void>}
 */
export async function deleteTransaction(transactionId) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();

        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        const { error } = await client
            .from('transactions')
            .delete()
            .eq('id', transactionId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error eliminando transacción:', error);
        throw error;
    }
}

/**
 * Elimina transacciones que coinciden con patrones de no-transacciones válidas
 * (estados de cuenta, límites de crédito, pagos rechazados, etc.)
 * @returns {Promise<number>} Número de transacciones eliminadas
 */
export async function deleteInvalidTransactions() {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();

        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Patrones de descripciones que indican que NO son transacciones válidas
        const invalidPatterns = [
            'estado de cuenta',
            'descargar tu estado',
            'tu límite es',
            'límite disponible',
            'pago rechazado',
            'rechazado',
            'intento fallido',
            'no se pudo',
            'no se completó',
            'falló',
            'error en el pago',
            'transacción cancelada'
        ];

        // Buscar transacciones con estas descripciones
        const { data: transactions, error: fetchError } = await client
            .from('transactions')
            .select('id, description, email_subject')
            .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        // Filtrar transacciones inválidas
        const invalidIds = (transactions || [])
            .filter(t => {
                const text = `${t.description || ''} ${t.email_subject || ''}`.toLowerCase();
                return invalidPatterns.some(pattern => text.includes(pattern));
            })
            .map(t => t.id);

        if (invalidIds.length === 0) {
            console.log('✅ No se encontraron transacciones inválidas para eliminar');
            return 0;
        }

        // Eliminar transacciones inválidas
        const { error: deleteError } = await client
            .from('transactions')
            .delete()
            .in('id', invalidIds)
            .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        console.log(`✅ Eliminadas ${invalidIds.length} transacciones inválidas`);
        return invalidIds.length;
    } catch (error) {
        console.error('Error eliminando transacciones inválidas:', error);
        throw error;
    }
}

// Exportar createTransaction al final (las demás ya tienen export inline)
export { 
    createTransaction
};
