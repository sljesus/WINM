// Componente reutilizable: Card de Categoría
// Principio SOLID: Responsabilidad única - Renderizar card de categoría

import { formatCurrency } from '../utils/currencyFormatter.js';
import { escapeHtml } from '../utils/escapeHtml.js';

/**
 * Crea un elemento DOM de card de categoría
 * @param {Object} category - Objeto de categoría
 * @param {string} category.id - ID de la categoría
 * @param {string} category.name - Nombre de la categoría
 * @param {string} category.icon - Icono (opcional)
 * @param {string} category.color - Color hex (opcional)
 * @param {boolean} category.is_system - Si es categoría del sistema
 * @param {Object} stats - Estadísticas de la categoría (opcional)
 * @param {number} stats.totalSpent - Total gastado
 * @param {number} stats.transactionCount - Número de transacciones
 * @param {Function} onEdit - Callback cuando se edita (category) => void
 * @param {Function} onDelete - Callback cuando se elimina (categoryId) => void
 * @returns {HTMLElement} Elemento DOM del card
 */
export function createCategoryCard(category, stats = null, onEdit = null, onDelete = null) {
    const {
        id,
        name,
        icon,
        color,
        is_system
    } = category;

    // Crear contenedor principal (diseño compacto tipo chip/badge)
    const card = document.createElement('div');
    card.className = 'category-card category-card--compact';

    // Contenedor principal con flex horizontal
    const mainContent = document.createElement('div');
    mainContent.className = 'category-card-main';

    // Icono pequeño con color de fondo
    const iconElement = document.createElement('div');
    iconElement.className = 'category-icon category-icon--compact';
    
    // Aplicar color de fondo si existe, sino usar color por defecto
    const bgColor = color || '#95A5A6';
    iconElement.style.backgroundColor = bgColor;
    
    // Mostrar icono como emoji o texto
    if (icon) {
        // Si es un emoji o texto simple, mostrarlo directamente
        iconElement.textContent = icon.length <= 2 ? icon : icon.substring(0, 2).toUpperCase();
    } else {
        // Si no hay icono, usar primera letra del nombre
        iconElement.textContent = (name || '?').charAt(0).toUpperCase();
    }

    // Contenedor de información (nombre y stats)
    const infoContainer = document.createElement('div');
    infoContainer.className = 'category-card-info';

    // Nombre de la categoría
    const nameElement = document.createElement('h3');
    nameElement.className = 'category-name category-name--compact';
    nameElement.textContent = escapeHtml(name || 'Sin nombre');

    // Estadísticas inline (si existen)
    if (stats && (stats.totalSpent > 0 || stats.transactionCount > 0)) {
        const statsInline = document.createElement('div');
        statsInline.className = 'category-stats-inline';
        
        const statsText = document.createElement('span');
        statsText.className = 'category-stats-text';
        const parts = [];
        if (stats.totalSpent > 0) {
            parts.push(formatCurrency(stats.totalSpent));
        }
        if (stats.transactionCount > 0) {
            parts.push(`${stats.transactionCount} transacción${stats.transactionCount !== 1 ? 'es' : ''}`);
        }
        statsText.textContent = parts.join(' • ');
        
        statsInline.appendChild(statsText);
        infoContainer.appendChild(nameElement);
        infoContainer.appendChild(statsInline);
    } else {
        infoContainer.appendChild(nameElement);
    }

    // Badge de sistema/personalizada (pequeño)
    const badge = document.createElement('span');
    badge.className = 'category-badge category-badge--compact';
    
    if (is_system) {
        badge.classList.add('category-badge--system');
        badge.textContent = 'Sistema';
    } else {
        badge.classList.add('category-badge--custom');
        badge.textContent = 'Personalizada';
    }

    // Contenedor de acciones (solo para categorías personalizadas, visible en hover)
    let actionsElement = null;
    if (!is_system) {
        actionsElement = document.createElement('div');
        actionsElement.className = 'category-card-actions category-card-actions--compact';

        const editButton = document.createElement('button');
        editButton.className = 'btn-icon';
        editButton.setAttribute('aria-label', 'Editar categoría');
        editButton.innerHTML = '✏️';
        editButton.title = 'Editar';
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onEdit) {
                onEdit(category);
            }
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-icon btn-icon--danger';
        deleteButton.setAttribute('aria-label', 'Eliminar categoría');
        deleteButton.innerHTML = '🗑️';
        deleteButton.title = 'Eliminar';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Estás seguro de que deseas eliminar esta categoría? Las transacciones asociadas perderán su categoría.')) {
                if (onDelete) {
                    onDelete(id);
                }
            }
        });

        actionsElement.appendChild(editButton);
        actionsElement.appendChild(deleteButton);
    }

    // Ensamblar card
    mainContent.appendChild(iconElement);
    mainContent.appendChild(infoContainer);
    mainContent.appendChild(badge);
    
    card.appendChild(mainContent);
    if (actionsElement) {
        card.appendChild(actionsElement);
    }

    return card;
}
