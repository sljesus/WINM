// Servicio de Transacciones
// SOLID SRP: Solo lógica de negocio. Acceso a datos vía TransactionRepository.

import { getMonthStart, getMonthEnd } from '../utils/dateFormatter.js';
import * as repo from './repositories/transactionRepository.js';
import { loadCategories } from './categoryService.js';

// Reexportar create para TransactionImportService y otros
export const createTransaction = repo.create;

/**
 * Carga transacciones con filtros (delega al repositorio)
 */
export async function loadTransactions(filters = {}) {
    return repo.findAll(filters);
}

/**
 * Calcula estadísticas sobre un array de transacciones (lógica de negocio)
 */
export function calculateStats(transactions) {
    if (!transactions?.length) {
        return {
            total: 0, totalIncome: 0, totalExpenses: 0, count: 0,
            monthTotal: 0, monthIncome: 0, monthExpenses: 0, monthCount: 0
        };
    }
    const now = new Date();
    const monthStart = getMonthStart(now);
    const monthEnd = getMonthEnd(now);

    const total = transactions.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const totalIncome = transactions
        .filter(t => parseFloat(t.amount || 0) > 0)
        .reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalExpenses = transactions
        .filter(t => parseFloat(t.amount || 0) < 0)
        .reduce((s, t) => s + parseFloat(t.amount), 0);

    const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
    });
    const monthTotal = monthTransactions.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const monthIncome = monthTransactions
        .filter(t => parseFloat(t.amount || 0) > 0)
        .reduce((s, t) => s + parseFloat(t.amount), 0);
    const monthExpenses = monthTransactions
        .filter(t => parseFloat(t.amount || 0) < 0)
        .reduce((s, t) => s + parseFloat(t.amount), 0);

    return {
        total, totalIncome, totalExpenses, count: transactions.length,
        monthTotal, monthIncome, monthExpenses, monthCount: monthTransactions.length
    };
}

export function getTransactionsByMonth(transactions, date) {
    const start = getMonthStart(date);
    const end = getMonthEnd(date);
    return transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
    });
}

export function getTransactionsByCategory(transactions, categoryId) {
    return transactions.filter(t => t.category_id === categoryId);
}

export function searchTransactions(transactions, searchTerm) {
    if (!searchTerm?.trim()) return transactions;
    const term = searchTerm.toLowerCase().trim();
    return transactions.filter(t => (t.description || '').toLowerCase().includes(term));
}

/**
 * Actualiza categoría de una transacción (delega al repositorio)
 */
export async function updateCategory(transactionId, categoryId, expenseDetail = null) {
    return repo.updateCategory(transactionId, categoryId, expenseDetail);
}

/**
 * Categorías disponibles. Única fuente: categoryService (no duplicar con transactionService).
 */
export async function getCategories() {
    return loadCategories();
}

/**
 * Fuentes únicas (delega al repositorio)
 */
export async function getSources() {
    return repo.getSources();
}

/**
 * Elimina una transacción (delega al repositorio)
 */
export async function deleteTransaction(transactionId) {
    return repo.remove(transactionId);
}

const INVALID_DESCRIPTION_PATTERNS = [
    'estado de cuenta', 'descargar tu estado', 'tu límite es', 'límite disponible',
    'pago rechazado', 'rechazado', 'intento fallido', 'no se pudo', 'no se completó',
    'falló', 'error en el pago', 'transacción cancelada'
];

/**
 * Elimina transacciones inválidas (delega al repositorio)
 */
export async function deleteInvalidTransactions() {
    const removed = await repo.removeInvalid(INVALID_DESCRIPTION_PATTERNS);
    if (removed > 0) console.log(`✅ Eliminadas ${removed} transacciones inválidas`);
    return removed;
}
