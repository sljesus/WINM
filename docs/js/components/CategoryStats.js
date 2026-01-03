// Componente CategoryStats
// Principio SOLID: Responsabilidad única - Mostrar estadísticas de categoría

import { formatCurrency } from '../utils/currencyFormatter.js';

/**
 * Crea elemento DOM con estadísticas de categoría
 * @param {Object} stats - Estadísticas
 * @param {number} stats.totalSpent - Total gastado
 * @param {number} stats.transactionCount - Número de transacciones
 * @returns {HTMLElement} Elemento DOM con estadísticas
 */
export function createCategoryStats(stats) {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'category-stats';

    const totalSpentItem = document.createElement('div');
    totalSpentItem.className = 'category-stat-item';
    
    const totalSpentLabel = document.createElement('div');
    totalSpentLabel.className = 'category-stat-label';
    totalSpentLabel.textContent = 'Total Gastado';
    
    const totalSpentValue = document.createElement('div');
    totalSpentValue.className = 'category-stat-value';
    totalSpentValue.textContent = formatCurrency(stats?.totalSpent || 0);

    totalSpentItem.appendChild(totalSpentLabel);
    totalSpentItem.appendChild(totalSpentValue);

    const transactionCountItem = document.createElement('div');
    transactionCountItem.className = 'category-stat-item';
    
    const transactionCountLabel = document.createElement('div');
    transactionCountLabel.className = 'category-stat-label';
    transactionCountLabel.textContent = 'Transacciones';
    
    const transactionCountValue = document.createElement('div');
    transactionCountValue.className = 'category-stat-value';
    transactionCountValue.textContent = (stats?.transactionCount || 0).toString();

    transactionCountItem.appendChild(transactionCountLabel);
    transactionCountItem.appendChild(transactionCountValue);

    statsContainer.appendChild(totalSpentItem);
    statsContainer.appendChild(transactionCountItem);

    return statsContainer;
}
