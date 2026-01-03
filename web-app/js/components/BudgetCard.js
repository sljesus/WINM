// Componente reutilizable: Card de Presupuesto
// Principio SOLID: Responsabilidad única - Renderizar card de presupuesto

import { formatCurrency } from '../utils/currencyFormatter.js';
import { formatDateShort } from '../utils/dateFormatter.js';
import { escapeHtml } from '../utils/escapeHtml.js';

/**
 * Crea un elemento DOM de card de presupuesto
 * @param {Object} budget - Objeto de presupuesto desde budget_summary
 * @param {string} budget.id - ID del presupuesto
 * @param {string} budget.category_name - Nombre de la categoría
 * @param {number} budget.budget_amount - Monto del presupuesto
 * @param {number} budget.current_spent - Gasto actual
 * @param {number} budget.percentage_used - Porcentaje usado (0-100)
 * @param {string} budget.status - Estado (ok, threshold, exceeded)
 * @param {string} budget.period_type - Tipo de período (mensual, semanal, anual)
 * @param {string} budget.period_start - Fecha de inicio
 * @param {string} budget.period_end - Fecha de fin
 * @param {number} budget.alert_threshold - Porcentaje de alerta
 * @param {Function} onEdit - Callback cuando se edita (budget) => void
 * @param {Function} onDelete - Callback cuando se elimina (budgetId) => void
 * @returns {HTMLElement} Elemento DOM del card
 */
export function createBudgetCard(budget, onEdit = null, onDelete = null) {
    const {
        id,
        category_name,
        budget_amount,
        current_spent,
        percentage_used,
        status,
        period_type,
        period_start,
        period_end,
        alert_threshold
    } = budget;

    // Crear contenedor principal
    const card = document.createElement('div');
    card.className = 'budget-card';

    // Header: categoría con badge de estado
    const header = document.createElement('div');
    header.className = 'budget-card-header';

    const categoryName = document.createElement('h3');
    categoryName.className = 'budget-category-name';
    categoryName.textContent = escapeHtml(category_name || 'Sin categoría');

    const statusBadge = document.createElement('span');
    statusBadge.className = 'budget-status-badge';
    
    // Determinar clase y texto según estado
    if (status === 'exceeded') {
        statusBadge.classList.add('budget-status-badge--danger');
        statusBadge.textContent = 'Excedido';
    } else if (status === 'threshold') {
        statusBadge.classList.add('budget-status-badge--warning');
        statusBadge.textContent = 'Alerta';
    } else {
        statusBadge.classList.add('budget-status-badge--ok');
        statusBadge.textContent = 'OK';
    }

    header.appendChild(categoryName);
    header.appendChild(statusBadge);

    // Body: montos
    const amounts = document.createElement('div');
    amounts.className = 'budget-amounts';

    const budgetRow = document.createElement('div');
    budgetRow.className = 'budget-amount-row';
    budgetRow.innerHTML = `
        <span>Presupuesto:</span>
        <strong>${formatCurrency(budget_amount)}</strong>
    `;

    const spentRow = document.createElement('div');
    spentRow.className = 'budget-amount-row';
    spentRow.innerHTML = `
        <span>Gastado:</span>
        <strong>${formatCurrency(current_spent)}</strong>
    `;

    const remainingRow = document.createElement('div');
    remainingRow.className = 'budget-amount-row';
    const remaining = Math.max(0, budget_amount - current_spent);
    remainingRow.innerHTML = `
        <span>Restante:</span>
        <strong>${formatCurrency(remaining)}</strong>
    `;

    amounts.appendChild(budgetRow);
    amounts.appendChild(spentRow);
    amounts.appendChild(remainingRow);

    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'budget-progress-container';

    const progressBar = document.createElement('div');
    progressBar.className = 'budget-progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'budget-progress-fill';
    
    // Determinar clase según estado
    if (status === 'exceeded') {
        progressFill.classList.add('budget-progress-fill--danger');
        progressFill.style.width = '100%'; // Mostrar completo aunque esté excedido
    } else if (status === 'threshold') {
        progressFill.classList.add('budget-progress-fill--warning');
        progressFill.style.width = `${Math.min(100, percentage_used)}%`;
    } else {
        progressFill.classList.add('budget-progress-fill--ok');
        progressFill.style.width = `${Math.min(100, percentage_used)}%`;
    }

    progressBar.appendChild(progressFill);

    const percentageText = document.createElement('div');
    percentageText.className = 'budget-percentage';
    percentageText.textContent = `${percentage_used.toFixed(1)}% usado`;

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(percentageText);

    // Información del período
    const periodInfo = document.createElement('div');
    periodInfo.className = 'budget-period-info';
    periodInfo.style.fontSize = '0.875rem';
    periodInfo.style.color = 'var(--text-secondary)';
    periodInfo.style.marginTop = '0.5rem';
    
    const periodTypeText = period_type === 'mensual' ? 'Mensual' : 
                          period_type === 'semanal' ? 'Semanal' : 'Anual';
    const startDate = formatDateShort(period_start);
    const endDate = formatDateShort(period_end);
    periodInfo.textContent = `${periodTypeText}: ${startDate} - ${endDate}`;

    // Footer: botones de acción
    const actions = document.createElement('div');
    actions.className = 'budget-card-actions';

    const editButton = document.createElement('button');
    editButton.className = 'btn btn-secondary';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => {
        if (onEdit) {
            onEdit(budget);
        }
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger';
    deleteButton.textContent = 'Desactivar';
    deleteButton.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas desactivar este presupuesto?')) {
            if (onDelete) {
                onDelete(id);
            }
        }
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    // Ensamblar card
    card.appendChild(header);
    card.appendChild(amounts);
    card.appendChild(progressContainer);
    card.appendChild(periodInfo);
    card.appendChild(actions);

    return card;
}
