// Componente CategoryManagementModal
// Principio SOLID: Responsabilidad única - Mostrar modal y manejar categoría

import { createCategory, updateCategory } from '../services/categoryService.js';
import { escapeHtml } from '../utils/escapeHtml.js';

let modalElement = null;
let currentCategory = null;
let onCategoryUpdated = null;
let listenersSetup = false;
let clickListenerSetup = false;

/**
 * Inicializa el modal de gestión de categorías
 * @param {Function} callback - Callback cuando se actualiza categoría (category) => void
 * @returns {Promise<HTMLElement>} Elemento del modal
 */
export async function initCategoryManagementModal(callback) {
    onCategoryUpdated = callback;
    
    // Obtener o crear modal
    if (!modalElement) {
        modalElement = ensureModalExists();
        setupModalListeners();
    }
    
    // Asegurar que el modal tiene contenido
    const nameInput = modalElement.querySelector('#category-management-modal-name');
    if (!nameInput) {
        // Si no hay contenido, crearlo
        const existingContent = modalElement.querySelector('.modal-content');
        const newContent = createModalContent();
        
        if (existingContent) {
            existingContent.replaceWith(newContent);
        } else {
            modalElement.appendChild(newContent);
        }
    }

    return modalElement;
}

/**
 * Asegura que el modal existe y tiene contenido
 * @returns {HTMLElement} Elemento del modal
 */
function ensureModalExists() {
    let modal = document.getElementById('category-management-modal');
    
    if (!modal) {
        // Crear modal completo si no existe
        modal = createModalElement();
        document.body.appendChild(modal);
        return modal;
    }
    
    // Verificar si tiene contenido válido
    const nameInput = modal.querySelector('#category-management-modal-name');
    
    if (!nameInput) {
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
 * Muestra el modal con formulario de categoría
 * @param {Object|null} category - Categoría a editar (null = crear nuevo)
 */
export async function showCategoryManagementModal(category = null) {
    let modal = document.getElementById('category-management-modal');
    
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
    let nameInput = modal.querySelector('#category-management-modal-name');
    let iconInput = modal.querySelector('#category-management-modal-icon');
    let colorInput = modal.querySelector('#category-management-modal-color');
    let colorPickerInput = modal.querySelector('#category-management-modal-color-picker');
    
    if (!nameInput || !iconInput || !colorInput || !colorPickerInput) {
        console.log('Recreando contenido del modal...');
        
        const existingContent = modal.querySelector('.modal-content');
        const newContent = createModalContent();
        
        if (existingContent) {
            existingContent.replaceWith(newContent);
        } else {
            modal.appendChild(newContent);
        }
        
        // Obtener referencias nuevamente del DOM
        nameInput = modal.querySelector('#category-management-modal-name');
        iconInput = modal.querySelector('#category-management-modal-icon');
        colorInput = modal.querySelector('#category-management-modal-color');
        colorPickerInput = modal.querySelector('#category-management-modal-color-picker');
        
        if (!nameInput || !iconInput || !colorInput || !colorPickerInput) {
            console.error('Error: No se pudo crear el contenido del modal');
            return;
        }
    }

    currentCategory = category;

    // Configurar título y botón
    const title = modal.querySelector('.modal-content h3');
    const saveButton = modal.querySelector('#category-management-modal-save');
    
    if (title) {
        title.textContent = category ? 'Editar Categoría' : 'Nueva Categoría';
    }
    
    if (saveButton) {
        saveButton.textContent = category ? 'Guardar' : 'Crear';
    }

    // Llenar formulario
    if (category) {
        // Modo edición
        nameInput.value = category.name || '';
        iconInput.value = category.icon || '';
        colorInput.value = category.color || '';
        colorPickerInput.value = category.color || '#95A5A6';
    } else {
        // Modo creación - valores por defecto
        nameInput.value = '';
        iconInput.value = '';
        colorInput.value = '';
        colorPickerInput.value = '#95A5A6';
    }

    // Sincronizar color picker con input de texto
    colorPickerInput.addEventListener('input', () => {
        colorInput.value = colorPickerInput.value;
    });

    colorInput.addEventListener('input', () => {
        const colorValue = colorInput.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
            colorPickerInput.value = colorValue;
        }
    });

    // Mostrar modal
    modal.classList.add('active');
}

/**
 * Oculta el modal
 */
export function hideCategoryManagementModal() {
    const modal = document.getElementById('category-management-modal');
    if (modal) {
        modal.classList.remove('active');
        currentCategory = null;
    }
}

/**
 * Crea el elemento completo del modal (contenedor + contenido)
 * @returns {HTMLElement} Elemento del modal
 */
function createModalElement() {
    const modal = document.createElement('div');
    modal.id = 'category-management-modal';
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
    title.textContent = 'Nueva Categoría';

    // Nombre
    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'category-management-modal-name');
    nameLabel.textContent = 'Nombre: *';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'category-management-modal-name';
    nameInput.name = 'category-management-modal-name';
    nameInput.required = true;
    nameInput.className = 'form-control';
    nameInput.placeholder = 'Ej: Netflix, Spotify, Gimnasio';

    // Icono
    const iconLabel = document.createElement('label');
    iconLabel.setAttribute('for', 'category-management-modal-icon');
    iconLabel.textContent = 'Icono (opcional):';

    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.id = 'category-management-modal-icon';
    iconInput.name = 'category-management-modal-icon';
    iconInput.className = 'form-control';
    iconInput.placeholder = 'Ej: 🎬, 🎵, 💪 o texto simple';

    // Color
    const colorLabel = document.createElement('label');
    colorLabel.setAttribute('for', 'category-management-modal-color');
    colorLabel.textContent = 'Color (opcional):';

    const colorContainer = document.createElement('div');
    colorContainer.style.display = 'flex';
    colorContainer.style.gap = '0.5rem';
    colorContainer.style.alignItems = 'center';

    const colorPickerInput = document.createElement('input');
    colorPickerInput.type = 'color';
    colorPickerInput.id = 'category-management-modal-color-picker';
    colorPickerInput.value = '#95A5A6';
    colorPickerInput.style.width = '50px';
    colorPickerInput.style.height = '40px';
    colorPickerInput.style.cursor = 'pointer';

    const colorInput = document.createElement('input');
    colorInput.type = 'text';
    colorInput.id = 'category-management-modal-color';
    colorInput.name = 'category-management-modal-color';
    colorInput.className = 'form-control';
    colorInput.placeholder = '#RRGGBB';
    colorInput.pattern = '^#[0-9A-Fa-f]{6}$';
    colorInput.style.flex = '1';

    colorContainer.appendChild(colorPickerInput);
    colorContainer.appendChild(colorInput);

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelButton = document.createElement('button');
    cancelButton.id = 'category-management-modal-cancel';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancelar';
    cancelButton.className = 'btn btn-secondary';

    const saveButton = document.createElement('button');
    saveButton.id = 'category-management-modal-save';
    saveButton.type = 'button';
    saveButton.textContent = 'Crear';
    saveButton.className = 'btn btn-primary';

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);

    // Ensamblar contenido
    content.appendChild(title);
    content.appendChild(nameLabel);
    content.appendChild(nameInput);
    content.appendChild(iconLabel);
    content.appendChild(iconInput);
    content.appendChild(colorLabel);
    content.appendChild(colorContainer);
    content.appendChild(actions);

    return content;
}

/**
 * Configura los event listeners del modal
 * Usa event delegation para evitar problemas con elementos recreados (KISS)
 */
function setupModalListeners() {
    const modal = document.getElementById('category-management-modal');
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
    const modal = document.getElementById('category-management-modal');
    if (!modal) return;
    
    // Cerrar al hacer clic fuera del modal
    if (e.target === modal) {
        hideCategoryManagementModal();
        return;
    }
    
    // Botón cancelar
    if (e.target.id === 'category-management-modal-cancel' || e.target.closest('#category-management-modal-cancel')) {
        hideCategoryManagementModal();
        return;
    }
    
    // Botón guardar
    if (e.target.id === 'category-management-modal-save' || e.target.closest('#category-management-modal-save')) {
        handleSaveCategory();
        return;
    }
}

/**
 * Maneja la tecla ESC para cerrar el modal
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('category-management-modal');
        if (modal && modal.classList.contains('active')) {
            hideCategoryManagementModal();
        }
    }
}

/**
 * Maneja el guardado de la categoría
 */
async function handleSaveCategory() {
    const modal = document.getElementById('category-management-modal');
    if (!modal) {
        console.error('Error: Modal no encontrado al guardar');
        return;
    }

    const nameInput = modal.querySelector('#category-management-modal-name');
    const iconInput = modal.querySelector('#category-management-modal-icon');
    const colorInput = modal.querySelector('#category-management-modal-color');

    const name = nameInput?.value?.trim();
    const icon = iconInput?.value?.trim() || null;
    const color = colorInput?.value?.trim() || null;

    // Validaciones
    if (!name) {
        alert('Por favor ingresa un nombre para la categoría');
        return;
    }

    // Validar formato de color si se proporciona
    if (color && color !== '') {
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!colorRegex.test(color)) {
            alert('El color debe estar en formato hex (#RRGGBB)');
            return;
        }
    }

    try {
        // Deshabilitar botón mientras se guarda
        const saveButton = modal.querySelector('#category-management-modal-save');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Guardando...';
        }

        const categoryData = {
            name: name,
            icon: icon,
            color: color
        };

        let savedCategory;
        if (currentCategory) {
            // Actualizar categoría existente
            savedCategory = await updateCategory(currentCategory.id, categoryData);
        } else {
            // Crear nueva categoría
            savedCategory = await createCategory(categoryData);
        }

        // Ocultar modal
        hideCategoryManagementModal();

        // Llamar callback
        if (onCategoryUpdated) {
            onCategoryUpdated(savedCategory);
        }
    } catch (error) {
        console.error('Error guardando categoría:', error);
        alert(error.message || 'Error al guardar la categoría. Por favor intenta de nuevo.');
    } finally {
        // Rehabilitar botón
        const modal = document.getElementById('category-management-modal');
        if (modal) {
            const saveButton = modal.querySelector('#category-management-modal-save');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = currentCategory ? 'Guardar' : 'Crear';
            }
        }
    }
}
