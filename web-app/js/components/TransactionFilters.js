// Componente TransactionFilters
// Principio SOLID: Responsabilidad única - Renderizar y manejar filtros de transacciones

import { getCategories, getSources } from '../services/transactionService.js';

/**
 * Crea y renderiza el componente de filtros
 * @param {Function} onFilterChange - Callback cuando cambian los filtros (filters) => void
 * @returns {Promise<HTMLElement>} Elemento contenedor de filtros
 */
export async function createTransactionFilters(onFilterChange) {
    const container = document.createElement('div');
    container.className = 'filters-container';
    container.id = 'filters-container';

    try {
        // Cargar datos para los dropdowns
        const [categories, sources] = await Promise.all([
            getCategories().catch(() => []),
            getSources().catch(() => [])
        ]);

        // Crear grupos de filtros
        const categoryGroup = createFilterGroup('Categoría', 'filter-category', [
            { value: '', text: 'Todas las categorías' },
            ...categories.map(cat => ({
                value: cat.id,
                text: cat.name
            }))
        ]);

        const sourceGroup = createFilterGroup('Fuente', 'filter-source', [
            { value: '', text: 'Todas las fuentes' },
            ...sources.map(source => ({
                value: source,
                text: source
            }))
        ]);

        const typeGroup = createFilterGroup('Tipo', 'filter-type', [
            { value: '', text: 'Todos' },
            { value: 'income', text: 'Ingresos' },
            { value: 'expense', text: 'Gastos' },
            { value: 'withdrawal', text: 'Retiros' }
        ]);

        const periodGroup = createFilterGroup('Período', 'filter-period', [
            { value: 'all', text: 'Todos' },
            { value: 'last7', text: 'Últimos 7 días' },
            { value: 'last30', text: 'Últimos 30 días' },
            { value: 'currentMonth', text: 'Mes actual' }
        ]);

        // Botón limpiar filtros
        const clearButton = document.createElement('button');
        clearButton.id = 'clear-filters';
        clearButton.textContent = 'Limpiar';
        clearButton.type = 'button';

        // Agregar elementos al contenedor
        container.appendChild(categoryGroup);
        container.appendChild(sourceGroup);
        container.appendChild(typeGroup);
        container.appendChild(periodGroup);
        container.appendChild(clearButton);

        // Configurar event listeners
        setupFilterListeners(container, onFilterChange, clearButton);

        return container;
    } catch (error) {
        console.error('Error creando filtros:', error);
        container.innerHTML = '<p class="error-message">Error cargando filtros</p>';
        return container;
    }
}

/**
 * Crea un grupo de filtro (label + select)
 * @param {string} labelText - Texto del label
 * @param {string} selectId - ID del select
 * @param {Array} options - Array de opciones {value, text}
 * @returns {HTMLElement} Elemento del grupo de filtro
 */
function createFilterGroup(labelText, selectId, options) {
    const group = document.createElement('div');
    group.className = 'filter-group';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.setAttribute('for', selectId);

    const select = document.createElement('select');
    select.id = selectId;
    select.name = selectId;

    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.text;
        select.appendChild(optionEl);
    });

    group.appendChild(label);
    group.appendChild(select);

    return group;
}

/**
 * Configura los event listeners para los filtros
 * @param {HTMLElement} container - Contenedor de filtros
 * @param {Function} onFilterChange - Callback cuando cambian los filtros
 * @param {HTMLElement} clearButton - Botón limpiar filtros
 */
function setupFilterListeners(container, onFilterChange, clearButton) {
    const filterSelects = container.querySelectorAll('select');
    
    // Listener para cambios en filtros
    filterSelects.forEach(select => {
        select.addEventListener('change', () => {
            const filters = getCurrentFilters(container);
            if (onFilterChange) {
                onFilterChange(filters);
            }
        });
    });

    // Listener para botón limpiar
    clearButton.addEventListener('click', () => {
        filterSelects.forEach(select => {
            if (select.id === 'filter-period') {
                select.value = 'all';
            } else {
                select.value = '';
            }
        });
        
        const filters = getCurrentFilters(container);
        if (onFilterChange) {
            onFilterChange(filters);
        }
    });
}

/**
 * Obtiene los valores actuales de los filtros
 * @param {HTMLElement} container - Contenedor de filtros
 * @returns {Object} Objeto con los valores de los filtros
 */
export function getCurrentFilters(container) {
    const categorySelect = container.querySelector('#filter-category');
    const sourceSelect = container.querySelector('#filter-source');
    const typeSelect = container.querySelector('#filter-type');
    const periodSelect = container.querySelector('#filter-period');

    return {
        category: categorySelect?.value || null,
        source: sourceSelect?.value || null,
        type: typeSelect?.value || null,
        period: periodSelect?.value || 'all'
    };
}
