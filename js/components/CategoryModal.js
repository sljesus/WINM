// Componente CategoryModal
// Principio SOLID: Responsabilidad única - Mostrar modal y manejar categorización

import { getCategories, updateCategory } from '../services/transactionService.js';
import { formatCurrencyWithSign } from '../utils/currencyFormatter.js';
import { escapeHtml } from '../utils/escapeHtml.js';

let modalElement = null;
let currentTransaction = null;
let onCategoryUpdated = null;
let listenersSetup = false;
let clickListenerSetup = false;

/**
 * Inicializa el modal de categorización
 * @param {Function} callback - Callback cuando se actualiza la categoría (transaction) => void
 * @returns {Promise<HTMLElement>} Elemento del modal
 */
export async function initCategoryModal(callback) {
    onCategoryUpdated = callback;
    
    // Obtener o crear modal
    if (!modalElement) {
        modalElement = ensureModalExists();
        setupModalListeners();
    }
    
    // Asegurar que el modal tiene contenido antes de cargar categorías
    const categorySelect = modalElement.querySelector('#modal-category');
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
    let modal = document.getElementById('category-modal');
    
    if (!modal) {
        // Crear modal completo si no existe
        modal = createModalElement();
        document.body.appendChild(modal);
        return modal;
    }
    
    // Verificar si tiene contenido válido (elementos clave deben existir)
    const categorySelect = modal.querySelector('#modal-category');
    
    if (!categorySelect) {
        // Modal existe pero está vacío - reemplazar completamente el contenido
        const existingContent = modal.querySelector('.modal-content');
        const newContent = createModalContent();
        
        if (existingContent) {
            // Reemplazar completamente el contenido existente (KISS)
            existingContent.replaceWith(newContent);
        } else {
            // No hay contenedor, agregarlo
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
        
        // Siempre obtener el modal del DOM para asegurar referencia correcta
        const modal = document.getElementById('category-modal');
        if (!modal) {
            console.error('Modal no encontrado en el DOM');
            return;
        }
        
        const categorySelect = modal.querySelector('#modal-category');
        
        if (!categorySelect) {
            console.error('Select de categorías no encontrado en el modal');
            return;
        }
        
        // Limpiar opciones existentes (excepto la primera)
        // Verificar que children existe antes de acceder
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
 * Muestra el modal con la información de la transacción
 * @param {Object} transaction - Transacción a categorizar
 */
export async function showCategoryModal(transaction) {
    // Siempre obtener el modal del DOM para asegurar que tenemos la referencia correcta
    let modal = document.getElementById('category-modal');
    
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
    
    // Verificar que el contenido existe - si no, recrearlo
    let categorySelect = modal.querySelector('#modal-category');
    let descriptionEl = modal.querySelector('#modal-description');
    let amountEl = modal.querySelector('#modal-amount');
    let expenseDetailEl = modal.querySelector('#modal-expense-detail');
    
    if (!categorySelect || !descriptionEl || !amountEl) {
        console.log('Recreando contenido del modal...');
        
        // Recrear contenido completamente (KISS)
        const existingContent = modal.querySelector('.modal-content');
        const newContent = createModalContent();
        
        if (existingContent) {
            existingContent.replaceWith(newContent);
        } else {
            modal.appendChild(newContent);
        }
        
        // Recargar categorías
        await loadCategoriesIntoModal();
        
        // Obtener referencias nuevamente del DOM
        categorySelect = modal.querySelector('#modal-category');
        descriptionEl = modal.querySelector('#modal-description');
        amountEl = modal.querySelector('#modal-amount');
        expenseDetailEl = modal.querySelector('#modal-expense-detail');
        
        // Verificar que se crearon correctamente
        if (!categorySelect || !descriptionEl || !amountEl) {
            console.error('Error: No se pudo crear el contenido del modal', {
                categorySelect: !!categorySelect,
                descriptionEl: !!descriptionEl,
                amountEl: !!amountEl,
                modalHTML: modal.innerHTML.substring(0, 300)
            });
            return;
        }
    }

    currentTransaction = transaction;

    // Llenar información de la transacción
    descriptionEl.textContent = escapeHtml(transaction.description || 'Sin descripción');
    
    const amount = parseFloat(transaction.amount || 0);
    amountEl.textContent = formatCurrencyWithSign(amount, true);

    // Resetear selección de categoría
    categorySelect.value = transaction.category_id || '';
    
    // Llenar expense_detail si existe
    if (expenseDetailEl) {
        expenseDetailEl.value = transaction.expense_detail || '';
    }

    // Mostrar modal
    modal.classList.add('active');
}

/**
 * Oculta el modal
 */
export function hideCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) {
        modal.classList.remove('active');
        currentTransaction = null;
    }
}

/**
 * Crea el elemento completo del modal (contenedor + contenido)
 * @returns {HTMLElement} Elemento del modal
 */
function createModalElement() {
    const modal = document.createElement('div');
    modal.id = 'category-modal';
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
    title.textContent = 'Categorizar Transacción';

    const descriptionLabel = document.createElement('p');
    descriptionLabel.innerHTML = 'Descripción: <span id="modal-description"></span>';

    const amountLabel = document.createElement('p');
    amountLabel.innerHTML = 'Monto: <span id="modal-amount"></span>';

    const categoryLabel = document.createElement('label');
    categoryLabel.setAttribute('for', 'modal-category');
    categoryLabel.textContent = 'Categoría:';

    const categorySelect = document.createElement('select');
    categorySelect.id = 'modal-category';
    categorySelect.name = 'modal-category';

    // Opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecciona una categoría';
    categorySelect.appendChild(defaultOption);

    // Campo para expense_detail (opcional)
    const detailLabel = document.createElement('label');
    detailLabel.setAttribute('for', 'modal-expense-detail');
    detailLabel.textContent = 'Detalle del gasto (opcional):';

    const detailInput = document.createElement('textarea');
    detailInput.id = 'modal-expense-detail';
    detailInput.name = 'modal-expense-detail';
    detailInput.rows = 3;
    detailInput.placeholder = 'Ej: Compra de alimentos en el supermercado';
    detailInput.className = 'form-control';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelButton = document.createElement('button');
    cancelButton.id = 'modal-cancel';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancelar';
    cancelButton.className = 'btn btn-secondary';

    const saveButton = document.createElement('button');
    saveButton.id = 'modal-save';
    saveButton.type = 'button';
    saveButton.textContent = 'Categorizar';
    saveButton.className = 'btn btn-primary';

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);

    content.appendChild(title);
    content.appendChild(descriptionLabel);
    content.appendChild(amountLabel);
    content.appendChild(categoryLabel);
    content.appendChild(categorySelect);
    content.appendChild(detailLabel);
    content.appendChild(detailInput);
    content.appendChild(actions);

    return content;
}

/**
 * Configura los event listeners del modal
 * Usa event delegation para evitar problemas con elementos recreados (KISS)
 */
function setupModalListeners() {
    // Siempre obtener el modal del DOM
    const modal = document.getElementById('category-modal');
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
    // Obtener el modal del DOM
    const modal = document.getElementById('category-modal');
    if (!modal) return;
    
    // Cerrar al hacer clic fuera del modal
    if (e.target === modal) {
        hideCategoryModal();
        return;
    }
    
    // Botón cancelar
    if (e.target.id === 'modal-cancel' || e.target.closest('#modal-cancel')) {
        hideCategoryModal();
        return;
    }
    
    // Botón guardar
    if (e.target.id === 'modal-save' || e.target.closest('#modal-save')) {
        handleSaveCategory();
        return;
    }
}

/**
 * Maneja la tecla ESC para cerrar el modal
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('category-modal');
        if (modal && modal.classList.contains('active')) {
            hideCategoryModal();
        }
    }
}

/**
 * Maneja el guardado de la categoría
 */
async function handleSaveCategory() {
    if (!currentTransaction) {
        return;
    }

    // Siempre obtener el modal del DOM
    const modal = document.getElementById('category-modal');
    if (!modal) {
        console.error('Error: Modal no encontrado al guardar');
        return;
    }

    const categorySelect = modal.querySelector('#modal-category');
    const categoryId = categorySelect?.value;

    if (!categoryId) {
        alert('Por favor selecciona una categoría');
        return;
    }

    // Capturar expense_detail (opcional)
    const expenseDetailInput = modal.querySelector('#modal-expense-detail');
    const expenseDetail = expenseDetailInput?.value?.trim() || null;

    try {
        // Deshabilitar botón mientras se guarda
        const saveButton = modal.querySelector('#modal-save');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Guardando...';
        }

        // Actualizar categoría con expense_detail
        const updatedTransaction = await updateCategory(
            currentTransaction.id,
            categoryId,
            expenseDetail
        );

        // Ocultar modal
        hideCategoryModal();

        // Llamar callback
        if (onCategoryUpdated) {
            onCategoryUpdated(updatedTransaction);
        }
    } catch (error) {
        console.error('Error guardando categoría:', error);
        alert('Error al guardar la categoría. Por favor intenta de nuevo.');
    } finally {
        // Rehabilitar botón
        const modal = document.getElementById('category-modal');
        if (modal) {
            const saveButton = modal.querySelector('#modal-save');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Categorizar';
            }
        }
    }
}
