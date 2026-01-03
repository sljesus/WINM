// Componente BudgetModal
// Principio SOLID: Responsabilidad única - Mostrar modal y manejar presupuesto

import { getCategories } from '../services/transactionService.js';
import { createBudget, updateBudget } from '../services/budgetService.js';
import { formatCurrency } from '../utils/currencyFormatter.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { getMonthStart, getMonthEnd } from '../utils/dateFormatter.js';

let modalElement = null;
let currentBudget = null;
let onBudgetUpdated = null;
let listenersSetup = false;
let clickListenerSetup = false;

/**
 * Inicializa el modal de presupuesto
 * @param {Function} callback - Callback cuando se actualiza presupuesto (budget) => void
 * @returns {Promise<HTMLElement>} Elemento del modal
 */
export async function initBudgetModal(callback) {
    onBudgetUpdated = callback;
    
    // Obtener o crear modal
    if (!modalElement) {
        modalElement = ensureModalExists();
        setupModalListeners();
    }
    
    // Asegurar que el modal tiene contenido antes de cargar categorías
    const categorySelect = modalElement.querySelector('#budget-modal-category');
    if (!categorySelect) {
        // Si no hay contenido, crearlo
        const existingContent = modalElement.querySelector('.modal-content');
        const newContent = createModalContent();
        
        if (existingContent) {
            existingContent.replaceWith(newContent);
        } else {
            modalElement.appendChild(newContent);
        }
    }

    // Cargar categorías
    await loadCategoriesIntoModal();

    return modalElement;
}

/**
 * Asegura que el modal existe y tiene contenido
 * @returns {HTMLElement} Elemento del modal
 */
function ensureModalExists() {
    let modal = document.getElementById('budget-modal');
    
    if (!modal) {
        // Crear modal completo si no existe
        modal = createModalElement();
        document.body.appendChild(modal);
        return modal;
    }
    
    // Verificar si tiene contenido válido
    const categorySelect = modal.querySelector('#budget-modal-category');
    
    if (!categorySelect) {
        // Modal existe pero está vacío - reemplazar completamente el contenido
        const existingContent = modal.querySelector('.modal-content');
        const newContent = createModalContent();
        
        if (existingContent) {
            existingContent.replaceWith(newContent);
        } else {
            modal.appendChild(newContent);
        }
    }
    
    return modal;
}

/**
 * Carga las categorías en el select del modal
 */
async function loadCategoriesIntoModal() {
    try {
        const categories = await getCategories();
        
        const modal = document.getElementById('budget-modal');
        if (!modal) {
            console.error('Modal no encontrado en el DOM');
            return;
        }
        
        const categorySelect = modal.querySelector('#budget-modal-category');
        
        if (!categorySelect) {
            console.error('Select de categorías no encontrado en el modal');
            return;
        }
        
        // Limpiar opciones existentes (excepto la primera)
        if (categorySelect.children && categorySelect.children.length > 1) {
            while (categorySelect.children.length > 1) {
                categorySelect.removeChild(categorySelect.lastChild);
            }
        }

        // Agregar categorías
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando categorías para modal:', error);
    }
}

/**
 * Calcula la fecha de fin según el tipo de período
 * @param {string} periodType - Tipo de período (mensual, semanal, anual)
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @returns {string} Fecha de fin (YYYY-MM-DD)
 */
function calculateEndDate(periodType, startDate) {
    const start = new Date(startDate);
    const end = new Date(start);

    switch (periodType) {
        case 'semanal':
            end.setDate(end.getDate() + 6);
            break;
        case 'mensual':
            end.setMonth(end.getMonth() + 1);
            end.setDate(end.getDate() - 1);
            break;
        case 'anual':
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(end.getDate() - 1);
            break;
        default:
            end.setMonth(end.getMonth() + 1);
            end.setDate(end.getDate() - 1);
    }

    return end.toISOString().split('T')[0];
}

/**
 * Muestra el modal con formulario de presupuesto
 * @param {Object|null} budget - Presupuesto a editar (null = crear nuevo)
 */
export async function showBudgetModal(budget = null) {
    let modal = document.getElementById('budget-modal');
    
    if (!modal) {
        console.error('Error: Modal no encontrado en el DOM');
        return;
    }
    
    // Actualizar referencia global
    modalElement = modal;
    
    // Asegurar que los listeners estén configurados
    if (!clickListenerSetup) {
        setupModalListeners();
    }
    
    // Verificar que el contenido existe
    let categorySelect = modal.querySelector('#budget-modal-category');
    let amountInput = modal.querySelector('#budget-modal-amount');
    let periodTypeInputs = modal.querySelectorAll('input[name="budget-modal-period-type"]');
    let startDateInput = modal.querySelector('#budget-modal-start-date');
    let endDateInput = modal.querySelector('#budget-modal-end-date');
    let thresholdInput = modal.querySelector('#budget-modal-threshold');
    
    if (!categorySelect || !amountInput || !startDateInput || !endDateInput || !thresholdInput) {
        console.log('Recreando contenido del modal...');
        
        const existingContent = modal.querySelector('.modal-content');
        const newContent = createModalContent();
        
        if (existingContent) {
            existingContent.replaceWith(newContent);
        } else {
            modal.appendChild(newContent);
        }
        
        await loadCategoriesIntoModal();
        
        // Obtener referencias nuevamente del DOM
        categorySelect = modal.querySelector('#budget-modal-category');
        amountInput = modal.querySelector('#budget-modal-amount');
        periodTypeInputs = modal.querySelectorAll('input[name="budget-modal-period-type"]');
        startDateInput = modal.querySelector('#budget-modal-start-date');
        endDateInput = modal.querySelector('#budget-modal-end-date');
        thresholdInput = modal.querySelector('#budget-modal-threshold');
        
        if (!categorySelect || !amountInput || !startDateInput || !endDateInput || !thresholdInput) {
            console.error('Error: No se pudo crear el contenido del modal');
            return;
        }
    }

    currentBudget = budget;

    // Configurar título y botón
    const title = modal.querySelector('.modal-content h3');
    const saveButton = modal.querySelector('#budget-modal-save');
    
    if (title) {
        title.textContent = budget ? 'Editar Presupuesto' : 'Nuevo Presupuesto';
    }
    
    if (saveButton) {
        saveButton.textContent = budget ? 'Guardar' : 'Crear';
    }

    // Llenar formulario
    if (budget) {
        // Modo edición
        categorySelect.value = budget.category_id || '';
        amountInput.value = budget.budget_amount || '';
        startDateInput.value = budget.period_start || '';
        endDateInput.value = budget.period_end || '';
        thresholdInput.value = budget.alert_threshold || 80;

        // Seleccionar tipo de período
        periodTypeInputs.forEach(input => {
            if (input.value === budget.period_type) {
                input.checked = true;
            }
        });
    } else {
        // Modo creación - valores por defecto
        categorySelect.value = '';
        amountInput.value = '';
        thresholdInput.value = 80;
        
        // Fecha de inicio: primer día del mes actual
        const now = new Date();
        const monthStart = getMonthStart(now);
        startDateInput.value = monthStart.toISOString().split('T')[0];
        
        // Fecha de fin: último día del mes actual
        const monthEnd = getMonthEnd(now);
        endDateInput.value = monthEnd.toISOString().split('T')[0];
        
        // Período por defecto: mensual
        periodTypeInputs.forEach(input => {
            input.checked = input.value === 'mensual';
        });
    }

    // Configurar listener para calcular fecha de fin automáticamente
    periodTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (input.checked && startDateInput.value) {
                const endDate = calculateEndDate(input.value, startDateInput.value);
                endDateInput.value = endDate;
            }
        });
    });

    startDateInput.addEventListener('change', () => {
        const checkedPeriod = Array.from(periodTypeInputs).find(input => input.checked);
        if (checkedPeriod && startDateInput.value) {
            const endDate = calculateEndDate(checkedPeriod.value, startDateInput.value);
            endDateInput.value = endDate;
        }
    });

    // Mostrar modal
    modal.classList.add('active');
}

/**
 * Oculta el modal
 */
export function hideBudgetModal() {
    const modal = document.getElementById('budget-modal');
    if (modal) {
        modal.classList.remove('active');
        currentBudget = null;
    }
}

/**
 * Crea el elemento completo del modal (contenedor + contenido)
 * @returns {HTMLElement} Elemento del modal
 */
function createModalElement() {
    const modal = document.createElement('div');
    modal.id = 'budget-modal';
    modal.className = 'modal';
    
    const content = createModalContent();
    modal.appendChild(content);
    
    return modal;
}

/**
 * Crea el contenido del modal (SOLID: Single Responsibility)
 * @returns {HTMLElement} Elemento del contenido del modal
 */
function createModalContent() {
    const content = document.createElement('div');
    content.className = 'modal-content';

    const title = document.createElement('h3');
    title.textContent = 'Nuevo Presupuesto';

    // Categoría
    const categoryLabel = document.createElement('label');
    categoryLabel.setAttribute('for', 'budget-modal-category');
    categoryLabel.textContent = 'Categoría: *';

    const categorySelect = document.createElement('select');
    categorySelect.id = 'budget-modal-category';
    categorySelect.name = 'budget-modal-category';
    categorySelect.required = true;

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecciona una categoría';
    categorySelect.appendChild(defaultOption);

    // Monto
    const amountLabel = document.createElement('label');
    amountLabel.setAttribute('for', 'budget-modal-amount');
    amountLabel.textContent = 'Monto: *';

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.id = 'budget-modal-amount';
    amountInput.name = 'budget-modal-amount';
    amountInput.min = '0.01';
    amountInput.step = '0.01';
    amountInput.required = true;
    amountInput.className = 'form-control';

    // Tipo de período
    const periodTypeLabel = document.createElement('label');
    periodTypeLabel.textContent = 'Tipo de Período: *';

    const periodTypeContainer = document.createElement('div');
    periodTypeContainer.style.display = 'flex';
    periodTypeContainer.style.gap = '1rem';
    periodTypeContainer.style.marginBottom = '1rem';

    const periods = [
        { value: 'mensual', label: 'Mensual' },
        { value: 'semanal', label: 'Semanal' },
        { value: 'anual', label: 'Anual' }
    ];

    periods.forEach(period => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '0.5rem';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'budget-modal-period-type';
        radio.id = `budget-modal-period-${period.value}`;
        radio.value = period.value;
        radio.required = true;

        const label = document.createElement('label');
        label.setAttribute('for', `budget-modal-period-${period.value}`);
        label.textContent = period.label;

        container.appendChild(radio);
        container.appendChild(label);
        periodTypeContainer.appendChild(container);
    });

    // Fecha de inicio
    const startDateLabel = document.createElement('label');
    startDateLabel.setAttribute('for', 'budget-modal-start-date');
    startDateLabel.textContent = 'Fecha de Inicio: *';

    const startDateInput = document.createElement('input');
    startDateInput.type = 'date';
    startDateInput.id = 'budget-modal-start-date';
    startDateInput.name = 'budget-modal-start-date';
    startDateInput.required = true;
    startDateInput.className = 'form-control';

    // Fecha de fin
    const endDateLabel = document.createElement('label');
    endDateLabel.setAttribute('for', 'budget-modal-end-date');
    endDateLabel.textContent = 'Fecha de Fin: *';

    const endDateInput = document.createElement('input');
    endDateInput.type = 'date';
    endDateInput.id = 'budget-modal-end-date';
    endDateInput.name = 'budget-modal-end-date';
    endDateInput.required = true;
    endDateInput.className = 'form-control';

    // Porcentaje de alerta
    const thresholdLabel = document.createElement('label');
    thresholdLabel.setAttribute('for', 'budget-modal-threshold');
    thresholdLabel.textContent = 'Porcentaje de Alerta (%):';

    const thresholdInput = document.createElement('input');
    thresholdInput.type = 'number';
    thresholdInput.id = 'budget-modal-threshold';
    thresholdInput.name = 'budget-modal-threshold';
    thresholdInput.min = '0';
    thresholdInput.max = '100';
    thresholdInput.value = '80';
    thresholdInput.className = 'form-control';

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelButton = document.createElement('button');
    cancelButton.id = 'budget-modal-cancel';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancelar';
    cancelButton.className = 'btn btn-secondary';

    const saveButton = document.createElement('button');
    saveButton.id = 'budget-modal-save';
    saveButton.type = 'button';
    saveButton.textContent = 'Crear';
    saveButton.className = 'btn btn-primary';

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);

    // Ensamblar contenido
    content.appendChild(title);
    content.appendChild(categoryLabel);
    content.appendChild(categorySelect);
    content.appendChild(amountLabel);
    content.appendChild(amountInput);
    content.appendChild(periodTypeLabel);
    content.appendChild(periodTypeContainer);
    content.appendChild(startDateLabel);
    content.appendChild(startDateInput);
    content.appendChild(endDateLabel);
    content.appendChild(endDateInput);
    content.appendChild(thresholdLabel);
    content.appendChild(thresholdInput);
    content.appendChild(actions);

    return content;
}

/**
 * Configura los event listeners del modal
 * Usa event delegation para evitar problemas con elementos recreados (KISS)
 */
function setupModalListeners() {
    const modal = document.getElementById('budget-modal');
    if (!modal) return;
    
    // Usar event delegation en el modal (solo agregar una vez)
    if (!clickListenerSetup) {
        modal.addEventListener('click', handleModalClick);
        clickListenerSetup = true;
    }

    // Cerrar con ESC (solo agregar una vez a nivel document)
    if (!listenersSetup) {
        document.addEventListener('keydown', handleEscapeKey);
        listenersSetup = true;
    }
}

/**
 * Maneja clicks en el modal (event delegation)
 */
function handleModalClick(e) {
    const modal = document.getElementById('budget-modal');
    if (!modal) return;
    
    // Cerrar al hacer clic fuera del modal
    if (e.target === modal) {
        hideBudgetModal();
        return;
    }
    
    // Botón cancelar
    if (e.target.id === 'budget-modal-cancel' || e.target.closest('#budget-modal-cancel')) {
        hideBudgetModal();
        return;
    }
    
    // Botón guardar
    if (e.target.id === 'budget-modal-save' || e.target.closest('#budget-modal-save')) {
        handleSaveBudget();
        return;
    }
}

/**
 * Maneja la tecla ESC para cerrar el modal
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('budget-modal');
        if (modal && modal.classList.contains('active')) {
            hideBudgetModal();
        }
    }
}

/**
 * Maneja el guardado del presupuesto
 */
async function handleSaveBudget() {
    const modal = document.getElementById('budget-modal');
    if (!modal) {
        console.error('Error: Modal no encontrado al guardar');
        return;
    }

    const categorySelect = modal.querySelector('#budget-modal-category');
    const amountInput = modal.querySelector('#budget-modal-amount');
    const periodTypeInputs = modal.querySelectorAll('input[name="budget-modal-period-type"]');
    const startDateInput = modal.querySelector('#budget-modal-start-date');
    const endDateInput = modal.querySelector('#budget-modal-end-date');
    const thresholdInput = modal.querySelector('#budget-modal-threshold');

    const categoryId = categorySelect?.value;
    const amount = amountInput?.value;
    const checkedPeriod = Array.from(periodTypeInputs).find(input => input.checked);
    const periodType = checkedPeriod?.value;
    const periodStart = startDateInput?.value;
    const periodEnd = endDateInput?.value;
    const threshold = thresholdInput?.value || 80;

    // Validaciones
    if (!categoryId) {
        alert('Por favor selecciona una categoría');
        return;
    }

    if (!amount || parseFloat(amount) <= 0) {
        alert('Por favor ingresa un monto válido mayor a 0');
        return;
    }

    if (!periodType) {
        alert('Por favor selecciona un tipo de período');
        return;
    }

    if (!periodStart || !periodEnd) {
        alert('Por favor ingresa las fechas de inicio y fin');
        return;
    }

    if (new Date(periodStart) > new Date(periodEnd)) {
        alert('La fecha de inicio debe ser anterior a la fecha de fin');
        return;
    }

    try {
        // Deshabilitar botón mientras se guarda
        const saveButton = modal.querySelector('#budget-modal-save');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Guardando...';
        }

        const budgetData = {
            category_id: categoryId,
            amount: parseFloat(amount),
            period_type: periodType,
            period_start: periodStart,
            period_end: periodEnd,
            alert_threshold: parseFloat(threshold)
        };

        let savedBudget;
        if (currentBudget) {
            // Actualizar presupuesto existente
            savedBudget = await updateBudget(currentBudget.id, budgetData);
        } else {
            // Crear nuevo presupuesto
            savedBudget = await createBudget(budgetData);
        }

        // Ocultar modal
        hideBudgetModal();

        // Llamar callback
        if (onBudgetUpdated) {
            onBudgetUpdated(savedBudget);
        }
    } catch (error) {
        console.error('Error guardando presupuesto:', error);
        alert(error.message || 'Error al guardar el presupuesto. Por favor intenta de nuevo.');
    } finally {
        // Rehabilitar botón
        const modal = document.getElementById('budget-modal');
        if (modal) {
            const saveButton = modal.querySelector('#budget-modal-save');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = currentBudget ? 'Guardar' : 'Crear';
            }
        }
    }
}
