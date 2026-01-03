// Componente RuleModal
// Principio SOLID: Responsabilidad única - Mostrar modal y manejar regla

import { createRule, updateRule } from '../services/ruleService.js';
import { getCategories } from '../services/transactionService.js';
import { escapeHtml } from '../utils/escapeHtml.js';

let modalElement = null;
let currentRule = null;
let onRuleUpdated = null;
let listenersSetup = false;
let clickListenerSetup = false;

/**
 * Tipos de regla permitidos con etiquetas
 */
const RULE_TYPES = [
    { value: 'contains', label: 'Contiene' },
    { value: 'starts_with', label: 'Empieza con' },
    { value: 'ends_with', label: 'Termina con' },
    { value: 'exact_match', label: 'Coincidencia exacta' },
    { value: 'regex', label: 'Expresión regular' }
];

/**
 * Inicializa el modal de reglas
 * @param {Function} callback - Callback cuando se actualiza regla (rule) => void
 * @returns {Promise<HTMLElement>} Elemento del modal
 */
export async function initRuleModal(callback) {
    onRuleUpdated = callback;
    
    // Obtener o crear modal
    if (!modalElement) {
        modalElement = ensureModalExists();
        setupModalListeners();
    }
    
    // Asegurar que el modal tiene contenido
    const categorySelect = modalElement.querySelector('#rule-modal-category');
    if (!categorySelect) {
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
    let modal = document.getElementById('rule-modal');
    
    if (!modal) {
        modal = createModalElement();
        document.body.appendChild(modal);
        return modal;
    }
    
    const categorySelect = modal.querySelector('#rule-modal-category');
    
    if (!categorySelect) {
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
        
        const modal = document.getElementById('rule-modal');
        if (!modal) {
            console.error('Modal no encontrado en el DOM');
            return;
        }
        
        const categorySelect = modal.querySelector('#rule-modal-category');
        
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
 * Muestra el modal con formulario de regla
 * @param {Object|null} rule - Regla a editar (null = crear nuevo)
 */
export async function showRuleModal(rule = null) {
    let modal = document.getElementById('rule-modal');
    
    if (!modal) {
        console.error('Error: Modal no encontrado en el DOM');
        return;
    }
    
    modalElement = modal;
    
    if (!clickListenerSetup) {
        setupModalListeners();
    }
    
    // Verificar que el contenido existe
    let categorySelect = modal.querySelector('#rule-modal-category');
    let ruleTypeSelect = modal.querySelector('#rule-modal-rule-type');
    let patternInput = modal.querySelector('#rule-modal-pattern');
    let caseSensitiveCheckbox = modal.querySelector('#rule-modal-case-sensitive');
    let priorityInput = modal.querySelector('#rule-modal-priority');
    let activeCheckbox = modal.querySelector('#rule-modal-active');
    
    if (!categorySelect || !ruleTypeSelect || !patternInput || !caseSensitiveCheckbox || !priorityInput || !activeCheckbox) {
        console.log('Recreando contenido del modal...');
        
        const existingContent = modal.querySelector('.modal-content');
        const newContent = createModalContent();
        
        if (existingContent) {
            existingContent.replaceWith(newContent);
        } else {
            modal.appendChild(newContent);
        }
        
        await loadCategoriesIntoModal();
        
        // Obtener referencias nuevamente
        categorySelect = modal.querySelector('#rule-modal-category');
        ruleTypeSelect = modal.querySelector('#rule-modal-rule-type');
        patternInput = modal.querySelector('#rule-modal-pattern');
        caseSensitiveCheckbox = modal.querySelector('#rule-modal-case-sensitive');
        priorityInput = modal.querySelector('#rule-modal-priority');
        activeCheckbox = modal.querySelector('#rule-modal-active');
        
        if (!categorySelect || !ruleTypeSelect || !patternInput || !caseSensitiveCheckbox || !priorityInput || !activeCheckbox) {
            console.error('Error: No se pudo crear el contenido del modal');
            return;
        }
    }

    currentRule = rule;

    // Configurar título y botón
    const title = modal.querySelector('.modal-content h3');
    const saveButton = modal.querySelector('#rule-modal-save');
    
    if (title) {
        title.textContent = rule ? 'Editar Regla' : 'Nueva Regla';
    }
    
    if (saveButton) {
        saveButton.textContent = rule ? 'Guardar' : 'Crear';
    }

    // Llenar formulario
    if (rule) {
        // Modo edición
        categorySelect.value = rule.category_id || '';
        ruleTypeSelect.value = rule.rule_type || 'contains';
        patternInput.value = rule.pattern || '';
        caseSensitiveCheckbox.checked = rule.is_case_sensitive || false;
        priorityInput.value = rule.priority !== undefined ? rule.priority : 100;
        activeCheckbox.checked = rule.is_active !== undefined ? rule.is_active : true;
    } else {
        // Modo creación - valores por defecto
        categorySelect.value = '';
        ruleTypeSelect.value = 'contains';
        patternInput.value = '';
        caseSensitiveCheckbox.checked = false;
        priorityInput.value = '100';
        activeCheckbox.checked = true;
    }

    // Mostrar modal
    modal.classList.add('active');
}

/**
 * Oculta el modal
 */
export function hideRuleModal() {
    const modal = document.getElementById('rule-modal');
    if (modal) {
        modal.classList.remove('active');
        currentRule = null;
    }
}

/**
 * Crea el elemento completo del modal
 * @returns {HTMLElement} Elemento del modal
 */
function createModalElement() {
    const modal = document.createElement('div');
    modal.id = 'rule-modal';
    modal.className = 'modal';
    
    const content = createModalContent();
    modal.appendChild(content);
    
    return modal;
}

/**
 * Crea el contenido del modal
 * @returns {HTMLElement} Elemento del contenido del modal
 */
function createModalContent() {
    const content = document.createElement('div');
    content.className = 'modal-content';

    const title = document.createElement('h3');
    title.textContent = 'Nueva Regla';

    // Categoría
    const categoryLabel = document.createElement('label');
    categoryLabel.setAttribute('for', 'rule-modal-category');
    categoryLabel.textContent = 'Categoría: *';

    const categorySelect = document.createElement('select');
    categorySelect.id = 'rule-modal-category';
    categorySelect.name = 'rule-modal-category';
    categorySelect.required = true;

    const defaultCategoryOption = document.createElement('option');
    defaultCategoryOption.value = '';
    defaultCategoryOption.textContent = 'Selecciona una categoría';
    categorySelect.appendChild(defaultCategoryOption);

    // Tipo de regla
    const ruleTypeLabel = document.createElement('label');
    ruleTypeLabel.setAttribute('for', 'rule-modal-rule-type');
    ruleTypeLabel.textContent = 'Tipo de Regla: *';

    const ruleTypeSelect = document.createElement('select');
    ruleTypeSelect.id = 'rule-modal-rule-type';
    ruleTypeSelect.name = 'rule-modal-rule-type';
    ruleTypeSelect.required = true;

    RULE_TYPES.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        ruleTypeSelect.appendChild(option);
    });

    // Patrón
    const patternLabel = document.createElement('label');
    patternLabel.setAttribute('for', 'rule-modal-pattern');
    patternLabel.textContent = 'Patrón: *';
    
    const patternHelp = document.createElement('small');
    patternHelp.style.display = 'block';
    patternHelp.style.color = 'var(--text-secondary)';
    patternHelp.style.fontSize = '0.875rem';
    patternHelp.style.marginBottom = '0.5rem';
    patternHelp.textContent = 'Texto a buscar en la descripción de las transacciones';

    const patternInput = document.createElement('input');
    patternInput.type = 'text';
    patternInput.id = 'rule-modal-pattern';
    patternInput.name = 'rule-modal-pattern';
    patternInput.required = true;
    patternInput.placeholder = 'Ej: STARBUCKS, SUPERMERCADO, etc.';
    patternInput.className = 'form-control';

    // Case sensitive
    const caseSensitiveContainer = document.createElement('div');
    caseSensitiveContainer.style.display = 'flex';
    caseSensitiveContainer.style.alignItems = 'center';
    caseSensitiveContainer.style.gap = '0.5rem';
    caseSensitiveContainer.style.marginBottom = '1rem';

    const caseSensitiveCheckbox = document.createElement('input');
    caseSensitiveCheckbox.type = 'checkbox';
    caseSensitiveCheckbox.id = 'rule-modal-case-sensitive';
    caseSensitiveCheckbox.name = 'rule-modal-case-sensitive';

    const caseSensitiveLabel = document.createElement('label');
    caseSensitiveLabel.setAttribute('for', 'rule-modal-case-sensitive');
    caseSensitiveLabel.textContent = 'Sensible a mayúsculas/minúsculas';

    caseSensitiveContainer.appendChild(caseSensitiveCheckbox);
    caseSensitiveContainer.appendChild(caseSensitiveLabel);

    // Prioridad
    const priorityLabel = document.createElement('label');
    priorityLabel.setAttribute('for', 'rule-modal-priority');
    priorityLabel.textContent = 'Prioridad:';
    
    const priorityHelp = document.createElement('small');
    priorityHelp.style.display = 'block';
    priorityHelp.style.color = 'var(--text-secondary)';
    priorityHelp.style.fontSize = '0.875rem';
    priorityHelp.style.marginBottom = '0.5rem';
    priorityHelp.textContent = 'Menor número = Mayor prioridad (se evalúan en orden)';

    const priorityInput = document.createElement('input');
    priorityInput.type = 'number';
    priorityInput.id = 'rule-modal-priority';
    priorityInput.name = 'rule-modal-priority';
    priorityInput.min = '0';
    priorityInput.value = '100';
    priorityInput.className = 'form-control';

    // Activa
    const activeContainer = document.createElement('div');
    activeContainer.style.display = 'flex';
    activeContainer.style.alignItems = 'center';
    activeContainer.style.gap = '0.5rem';
    activeContainer.style.marginBottom = '1rem';

    const activeCheckbox = document.createElement('input');
    activeCheckbox.type = 'checkbox';
    activeCheckbox.id = 'rule-modal-active';
    activeCheckbox.name = 'rule-modal-active';
    activeCheckbox.checked = true;

    const activeLabel = document.createElement('label');
    activeLabel.setAttribute('for', 'rule-modal-active');
    activeLabel.textContent = 'Regla activa';

    activeContainer.appendChild(activeCheckbox);
    activeContainer.appendChild(activeLabel);

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelButton = document.createElement('button');
    cancelButton.id = 'rule-modal-cancel';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancelar';
    cancelButton.className = 'btn btn-secondary';

    const saveButton = document.createElement('button');
    saveButton.id = 'rule-modal-save';
    saveButton.type = 'button';
    saveButton.textContent = 'Crear';
    saveButton.className = 'btn btn-primary';

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);

    // Ensamblar contenido
    content.appendChild(title);
    content.appendChild(categoryLabel);
    content.appendChild(categorySelect);
    content.appendChild(ruleTypeLabel);
    content.appendChild(ruleTypeSelect);
    content.appendChild(patternLabel);
    content.appendChild(patternHelp);
    content.appendChild(patternInput);
    content.appendChild(caseSensitiveContainer);
    content.appendChild(priorityLabel);
    content.appendChild(priorityHelp);
    content.appendChild(priorityInput);
    content.appendChild(activeContainer);
    content.appendChild(actions);

    return content;
}

/**
 * Configura los event listeners del modal
 */
function setupModalListeners() {
    const modal = document.getElementById('rule-modal');
    if (!modal) return;
    
    if (!clickListenerSetup) {
        modal.addEventListener('click', handleModalClick);
        clickListenerSetup = true;
    }

    if (!listenersSetup) {
        document.addEventListener('keydown', handleEscapeKey);
        listenersSetup = true;
    }
}

/**
 * Maneja clicks en el modal
 */
function handleModalClick(e) {
    const modal = document.getElementById('rule-modal');
    if (!modal) return;
    
    if (e.target === modal) {
        hideRuleModal();
        return;
    }
    
    if (e.target.id === 'rule-modal-cancel' || e.target.closest('#rule-modal-cancel')) {
        hideRuleModal();
        return;
    }
    
    if (e.target.id === 'rule-modal-save' || e.target.closest('#rule-modal-save')) {
        handleSaveRule();
        return;
    }
}

/**
 * Maneja la tecla ESC
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('rule-modal');
        if (modal && modal.classList.contains('active')) {
            hideRuleModal();
        }
    }
}

/**
 * Maneja el guardado de la regla
 */
async function handleSaveRule() {
    const modal = document.getElementById('rule-modal');
    if (!modal) return;

    const categorySelect = modal.querySelector('#rule-modal-category');
    const ruleTypeSelect = modal.querySelector('#rule-modal-rule-type');
    const patternInput = modal.querySelector('#rule-modal-pattern');
    const caseSensitiveCheckbox = modal.querySelector('#rule-modal-case-sensitive');
    const priorityInput = modal.querySelector('#rule-modal-priority');
    const activeCheckbox = modal.querySelector('#rule-modal-active');

    if (!categorySelect || !ruleTypeSelect || !patternInput || !caseSensitiveCheckbox || !priorityInput || !activeCheckbox) {
        alert('Error: No se encontraron los campos del formulario');
        return;
    }

    // Validar campos requeridos
    if (!categorySelect.value) {
        alert('Por favor selecciona una categoría');
        categorySelect.focus();
        return;
    }

    if (!patternInput.value.trim()) {
        alert('Por favor ingresa un patrón');
        patternInput.focus();
        return;
    }

    // Validar prioridad
    const priority = parseInt(priorityInput.value);
    if (isNaN(priority) || priority < 0) {
        alert('La prioridad debe ser un número mayor o igual a 0');
        priorityInput.focus();
        return;
    }

    // Validar regex si el tipo es regex
    if (ruleTypeSelect.value === 'regex') {
        try {
            new RegExp(patternInput.value.trim());
        } catch (regexError) {
            alert('El patrón regex no es válido: ' + regexError.message);
            patternInput.focus();
            return;
        }
    }

    try {
        const ruleData = {
            category_id: categorySelect.value,
            rule_type: ruleTypeSelect.value,
            pattern: patternInput.value.trim(),
            is_case_sensitive: caseSensitiveCheckbox.checked,
            priority: priority,
            is_active: activeCheckbox.checked
        };

        let result;
        if (currentRule) {
            // Actualizar regla existente
            result = await updateRule(currentRule.id, ruleData);
        } else {
            // Crear nueva regla
            result = await createRule(ruleData);
        }

        // Cerrar modal
        hideRuleModal();

        // Llamar callback
        if (onRuleUpdated) {
            onRuleUpdated(result);
        }
    } catch (error) {
        console.error('Error guardando regla:', error);
        alert(error.message || 'Error al guardar la regla');
    }
}
