// Componente reutilizable: Card de Regla de Auto-categorización
// Principio SOLID: Responsabilidad única - Renderizar card de regla

import { escapeHtml } from '../utils/escapeHtml.js';

/**
 * Mapeo de tipos de regla a texto legible
 */
const RULE_TYPE_LABELS = {
    'contains': 'Contiene',
    'starts_with': 'Empieza con',
    'ends_with': 'Termina con',
    'regex': 'Expresión regular',
    'exact_match': 'Coincidencia exacta'
};

/**
 * Mapeo de tipos de regla a colores de badge
 */
const RULE_TYPE_COLORS = {
    'contains': '#3b82f6',      // Azul
    'starts_with': '#8b5cf6',   // Púrpura
    'ends_with': '#ec4899',     // Rosa
    'regex': '#f59e0b',         // Amarillo/Naranja
    'exact_match': '#10b981'    // Verde
};

/**
 * Crea un elemento DOM de card de regla
 * @param {Object} rule - Objeto de regla con JOIN a categories
 * @param {string} rule.id - ID de la regla
 * @param {string} rule.pattern - Patrón a buscar
 * @param {string} rule.rule_type - Tipo de regla
 * @param {boolean} rule.is_case_sensitive - Si distingue mayúsculas/minúsculas
 * @param {number} rule.priority - Prioridad (menor = mayor prioridad)
 * @param {boolean} rule.is_active - Si está activa
 * @param {number} rule.match_count - Número de coincidencias
 * @param {Object} rule.categories - Objeto de categoría con name, icon, color
 * @param {Function} onEdit - Callback cuando se edita (rule) => void
 * @param {Function} onDelete - Callback cuando se elimina (ruleId) => void
 * @param {Function} onToggle - Callback cuando se activa/desactiva (ruleId, isActive) => void
 * @returns {HTMLElement} Elemento DOM del card
 */
export function createRuleCard(rule, onEdit = null, onDelete = null, onToggle = null) {
    const {
        id,
        pattern,
        rule_type,
        is_case_sensitive,
        priority,
        is_active,
        match_count,
        categories
    } = rule;

    // Crear contenedor principal
    const card = document.createElement('div');
    card.className = 'rule-card';
    
    // Agregar clase si está inactiva
    if (!is_active) {
        card.classList.add('rule-card--inactive');
    }

    // Header: Patrón y tipo de regla
    const header = document.createElement('div');
    header.className = 'rule-card-header';

    const patternContainer = document.createElement('div');
    patternContainer.className = 'rule-pattern-container';

    const patternLabel = document.createElement('span');
    patternLabel.className = 'rule-pattern-label';
    patternLabel.textContent = 'Patrón:';

    const patternText = document.createElement('code');
    patternText.className = 'rule-pattern';
    patternText.textContent = escapeHtml(pattern || 'Sin patrón');

    patternContainer.appendChild(patternLabel);
    patternContainer.appendChild(patternText);

    const typeBadge = document.createElement('span');
    typeBadge.className = 'rule-type-badge';
    typeBadge.textContent = RULE_TYPE_LABELS[rule_type] || rule_type;
    typeBadge.style.backgroundColor = RULE_TYPE_COLORS[rule_type] || '#64748b';

    header.appendChild(patternContainer);
    header.appendChild(typeBadge);

    // Body: Información de la regla
    const body = document.createElement('div');
    body.className = 'rule-card-body';

    // Categoría
    const categoryRow = document.createElement('div');
    categoryRow.className = 'rule-info-row';
    
    const categoryLabel = document.createElement('span');
    categoryLabel.className = 'rule-info-label';
    categoryLabel.textContent = 'Categoría:';
    
    const categoryValue = document.createElement('span');
    categoryValue.className = 'rule-info-value';
    
    if (categories) {
        const categoryName = document.createElement('span');
        categoryName.textContent = escapeHtml(categories.name || 'Sin categoría');
        
        if (categories.color) {
            const categoryBadge = document.createElement('span');
            categoryBadge.className = 'rule-category-badge';
            categoryBadge.style.backgroundColor = categories.color;
            categoryBadge.style.color = 'white';
            categoryBadge.style.padding = '0.2rem 0.5rem';
            categoryBadge.style.borderRadius = '4px';
            categoryBadge.style.fontSize = '0.75rem';
            categoryBadge.style.marginLeft = '0.5rem';
            categoryBadge.textContent = categories.icon || categories.name?.charAt(0) || '?';
            categoryValue.appendChild(categoryName);
            categoryValue.appendChild(categoryBadge);
        } else {
            categoryValue.textContent = categories.name || 'Sin categoría';
        }
    } else {
        categoryValue.textContent = 'Sin categoría';
    }
    
    categoryRow.appendChild(categoryLabel);
    categoryRow.appendChild(categoryValue);

    // Prioridad
    const priorityRow = document.createElement('div');
    priorityRow.className = 'rule-info-row';
    
    const priorityLabel = document.createElement('span');
    priorityLabel.className = 'rule-info-label';
    priorityLabel.textContent = 'Prioridad:';
    
    const priorityValue = document.createElement('span');
    priorityValue.className = 'rule-priority';
    priorityValue.textContent = priority !== undefined ? priority.toString() : '100';
    
    // Indicador visual de prioridad (menor número = más importante)
    if (priority !== undefined && priority < 50) {
        priorityValue.classList.add('rule-priority--high');
    } else if (priority !== undefined && priority < 100) {
        priorityValue.classList.add('rule-priority--medium');
    } else {
        priorityValue.classList.add('rule-priority--low');
    }
    
    priorityRow.appendChild(priorityLabel);
    priorityRow.appendChild(priorityValue);

    // Case sensitive
    if (is_case_sensitive) {
        const caseRow = document.createElement('div');
        caseRow.className = 'rule-info-row';
        
        const caseBadge = document.createElement('span');
        caseBadge.className = 'rule-case-badge';
        caseBadge.textContent = 'Sensible a mayúsculas';
        caseBadge.style.fontSize = '0.75rem';
        caseBadge.style.color = 'var(--text-secondary)';
        caseBadge.style.fontStyle = 'italic';
        
        caseRow.appendChild(caseBadge);
        body.appendChild(caseRow);
    }

    body.appendChild(categoryRow);
    body.appendChild(priorityRow);

    // Estadísticas: match_count
    const statsRow = document.createElement('div');
    statsRow.className = 'rule-stats-row';
    
    const statsLabel = document.createElement('span');
    statsLabel.className = 'rule-stats-label';
    statsLabel.textContent = 'Coincidencias:';
    
    const statsValue = document.createElement('span');
    statsValue.className = 'rule-match-count';
    statsValue.textContent = match_count !== undefined ? match_count.toString() : '0';
    
    statsRow.appendChild(statsLabel);
    statsRow.appendChild(statsValue);

    // Footer: Estado y acciones
    const footer = document.createElement('div');
    footer.className = 'rule-card-footer';

    const statusBadge = document.createElement('span');
    statusBadge.className = 'rule-status-badge';
    
    if (is_active) {
        statusBadge.classList.add('rule-status-badge--active');
        statusBadge.textContent = 'Activa';
    } else {
        statusBadge.classList.add('rule-status-badge--inactive');
        statusBadge.textContent = 'Inactiva';
    }

    const actions = document.createElement('div');
    actions.className = 'rule-card-actions';

    const toggleButton = document.createElement('button');
    toggleButton.className = 'btn btn-sm';
    toggleButton.classList.add(is_active ? 'btn-secondary' : 'btn-primary');
    toggleButton.textContent = is_active ? 'Desactivar' : 'Activar';
    toggleButton.addEventListener('click', () => {
        if (onToggle) {
            onToggle(id, !is_active);
        }
    });

    const editButton = document.createElement('button');
    editButton.className = 'btn btn-secondary btn-sm';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => {
        if (onEdit) {
            onEdit(rule);
        }
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger btn-sm';
    deleteButton.textContent = 'Eliminar';
    deleteButton.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas eliminar esta regla?')) {
            if (onDelete) {
                onDelete(id);
            }
        }
    });

    actions.appendChild(toggleButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    footer.appendChild(statusBadge);
    footer.appendChild(actions);

    // Ensamblar card
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(statsRow);
    card.appendChild(footer);

    return card;
}
