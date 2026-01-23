// Repositorio de Transacciones (capa de datos)
// SOLID SRP: Solo acceso a datos (Supabase). Sin lógica de negocio.

import { getSupabaseClient, ensureUser } from '../supabaseService.js';

/**
 * Lista transacciones del usuario con filtros
 * @param {Object} filters - startDate, endDate, categoryId, source, transactionType, limit, offset
 * @returns {Promise<Array>}
 */
export async function findAll(filters = {}) {
    const user = await ensureUser();
    const client = getSupabaseClient();

    let query = client
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.transactionType) query = query.eq('transaction_type', filters.transactionType);

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
}

/**
 * Crea una transacción
 * @param {Object} data - amount, description, date, source, transaction_type, email_id, email_subject, needs_categorization, bank
 * @returns {Promise<Object>}
 */
export async function create(data) {
    const user = await ensureUser();
    const client = getSupabaseClient();

    const { data: row, error } = await client
        .from('transactions')
        .insert({ ...data, user_id: user.id })
        .select('*, categories(name, icon, color)')
        .single();

    if (error) throw error;
    return row;
}

/**
 * Actualiza la categoría de una transacción
 * @param {string} transactionId
 * @param {string} categoryId
 * @param {string|null} expenseDetail
 * @returns {Promise<Object>}
 */
export async function updateCategory(transactionId, categoryId, expenseDetail = null) {
    const user = await ensureUser();
    const client = getSupabaseClient();

    const updateData = { category_id: categoryId, needs_categorization: false };
    if (expenseDetail != null) updateData.expense_detail = expenseDetail;

    const { data, error } = await client
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .select('*, categories(name, icon, color)')
        .single();

    if (error) throw error;
    return data;
}

/**
 * Busca una transacción por email_id (para detectar duplicados)
 * @param {string} emailId
 * @returns {Promise<Object|null>}
 */
export async function findByEmailId(emailId) {
    try {
        const user = await ensureUser();
        const client = getSupabaseClient();

        const { data, error } = await client
            .from('transactions')
            .select('id, email_id')
            .eq('user_id', user.id)
            .eq('email_id', emailId)
            .maybeSingle();

        if (error) return null;
        return data;
    } catch {
        return null;
    }
}

/**
 * Verifica si existe una transacción con el mismo email_id
 * @param {string} emailId
 * @returns {Promise<boolean>}
 */
export async function existsByEmailId(emailId) {
    const found = await findByEmailId(emailId);
    return found != null;
}

/**
 * Fuentes únicas del usuario
 * @returns {Promise<Array<string>>}
 */
export async function getSources() {
    const user = await ensureUser();
    const client = getSupabaseClient();

    const { data, error } = await client
        .from('transactions')
        .select('source')
        .eq('user_id', user.id)
        .not('source', 'is', null);

    if (error) throw error;
    const unique = [...new Set((data ?? []).map(t => t.source))];
    return unique.sort();
}

/**
 * Elimina una transacción
 * @param {string} transactionId
 * @returns {Promise<void>}
 */
export async function remove(transactionId) {
    const user = await ensureUser();
    const client = getSupabaseClient();

    const { error } = await client
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Elimina transacciones con descripciones que coinciden patrones inválidos
 * @param {string[]} invalidPatterns - Subcadenas en description/email_subject
 * @returns {Promise<number>} Cantidad eliminada
 */
export async function removeInvalid(invalidPatterns) {
    const user = await ensureUser();
    const client = getSupabaseClient();

    const { data: transactions, error: fetchError } = await client
        .from('transactions')
        .select('id, description, email_subject')
        .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    const invalidIds = (transactions ?? [])
        .filter(t => {
            const text = `${t.description ?? ''} ${t.email_subject ?? ''}`.toLowerCase();
            return invalidPatterns.some(p => text.includes(p));
        })
        .map(t => t.id);

    if (invalidIds.length === 0) return 0;

    const { error: deleteError } = await client
        .from('transactions')
        .delete()
        .in('id', invalidIds)
        .eq('user_id', user.id);

    if (deleteError) throw deleteError;
    return invalidIds.length;
}
