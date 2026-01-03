// Componente reutilizable: Item de Transacción
// Principio SOLID: Responsabilidad única - Renderizar item de transacción

import { formatDateShort, formatDateTime } from '../utils/dateFormatter.js';
import { formatCurrencyWithSign } from '../utils/currencyFormatter.js';
import { escapeHtml } from '../utils/escapeHtml.js';

/**
 * Crea un elemento DOM de item de transacción
 * @param {Object} transaction - Objeto de transacción
 * @param {string} transaction.id - ID de la transacción
 * @param {string} transaction.description - Descripción de la transacción
 * @param {Date|string} transaction.date - Fecha de la transacción
 * @param {number} transaction.amount - Monto de la transacción
 * @param {string} transaction.source - Fuente (BBVA, Mercado Pago, etc.)
 * @param {string} transaction.bank - Banco (compatibilidad)
 * @param {string} transaction.category - Categoría (opcional)
 * @param {Object} transaction.categories - Objeto de categoría con name, color (opcional)
 * @param {boolean} transaction.needs_categorization - Si necesita categorización
 * @param {Function} onCategorizeClick - Callback cuando se hace clic en categorizar (transaction) => void
 * @returns {HTMLElement} Elemento DOM del item de transacción
 */
export function createTransactionItem(transaction, onCategorizeClick = null) {
    const {
        id,
        description,
        date,
        amount,
        source,
        bank,
        category,
        categories,
        needs_categorization
    } = transaction;

    const amountNum = parseFloat(amount);
    const amountClass = amountNum >= 0 ? 'positive' : 'negative';
    const formattedDate = formatDateShort(date);
    const formattedAmount = formatCurrencyWithSign(amountNum, true);
    
    // Usar source o bank como fallback
    const sourceDisplay = source || bank || 'Desconocido';
    
    // Obtener información de categoría
    const categoryName = categories?.name || category || null;
    const categoryColor = categories?.color || null;

    // Crear contenedor principal
    const item = document.createElement('div');
    item.className = 'transaction-item';

    // Crear información de transacción
    const infoEl = document.createElement('div');
    infoEl.className = 'transaction-info';

    // Descripción
    const descriptionEl = document.createElement('div');
    descriptionEl.className = 'transaction-description';
    descriptionEl.textContent = escapeHtml(description);
    infoEl.appendChild(descriptionEl);

    // Meta información (fecha, fuente, categoría)
    const metaEl = document.createElement('div');
    metaEl.className = 'transaction-meta';
    
    const metaParts = [formattedDate, sourceDisplay];
    
    // Agregar categoría si existe
    if (categoryName) {
        if (categoryColor) {
            const categoryTag = document.createElement('span');
            categoryTag.className = 'category-tag';
            categoryTag.textContent = categoryName;
            categoryTag.style.backgroundColor = categoryColor;
            metaParts.push(categoryTag.outerHTML);
        } else {
            metaParts.push(categoryName);
        }
    }
    
    // Agregar badge de pendiente si necesita categorización
    if (needs_categorization) {
        const pendingBadge = document.createElement('span');
        pendingBadge.className = 'pending-badge';
        pendingBadge.textContent = 'Pendiente';
        metaParts.push(pendingBadge.outerHTML);
    }
    
    metaEl.innerHTML = metaParts.join(' • ');
    infoEl.appendChild(metaEl);

    item.appendChild(infoEl);

    // Crear contenedor de acciones (monto + botón categorizar)
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'transaction-actions';

    // Crear monto
    const amountEl = document.createElement('div');
    amountEl.className = `transaction-amount ${amountClass}`;
    amountEl.textContent = formattedAmount;
    actionsContainer.appendChild(amountEl);

    // Agregar botón categorizar si necesita categorización
    if (needs_categorization && onCategorizeClick) {
        const categorizeButton = document.createElement('button');
        categorizeButton.className = 'btn btn-primary btn-sm';
        categorizeButton.textContent = 'Categorizar';
        categorizeButton.type = 'button';
        categorizeButton.addEventListener('click', () => {
            onCategorizeClick(transaction);
        });
        actionsContainer.appendChild(categorizeButton);
    }

    item.appendChild(actionsContainer);

    return item;
}
