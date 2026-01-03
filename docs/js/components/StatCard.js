// Componente reutilizable: Tarjeta de Estadísticas
// Principio SOLID: Responsabilidad única - Renderizar tarjeta de estadísticas

import { formatCurrency, formatCurrencyWithSign } from '../utils/currencyFormatter.js';

/**
 * Crea un elemento DOM de tarjeta de estadísticas
 * @param {string} title - Título de la estadística
 * @param {number} value - Valor numérico a mostrar
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.isPositive - Si es true, muestra en verde; si es false, en rojo
 * @param {string} options.icon - Icono opcional (emoji o texto)
 * @param {string} options.subtitle - Subtítulo opcional
 * @param {boolean} options.showSign - Mostrar signo + para positivos
 * @returns {HTMLElement} Elemento DOM de la tarjeta
 */
export function createStatCard(title, value, options = {}) {
    const {
        isPositive = null,
        icon = null,
        subtitle = null,
        showSign = false
    } = options;

    // Crear contenedor principal
    const card = document.createElement('div');
    card.className = 'stat-card';

    // Agregar icono si existe
    if (icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'stat-card-icon';
        iconEl.textContent = icon;
        card.appendChild(iconEl);
    }

    // Crear título
    const titleEl = document.createElement('h3');
    titleEl.className = 'stat-card-title';
    titleEl.textContent = title;
    card.appendChild(titleEl);

    // Crear subtítulo si existe
    if (subtitle) {
        const subtitleEl = document.createElement('p');
        subtitleEl.className = 'stat-card-subtitle';
        subtitleEl.textContent = subtitle;
        card.appendChild(subtitleEl);
    }

    // Crear valor
    const valueEl = document.createElement('p');
    valueEl.className = 'stat-card-value';
    
    // Aplicar clase de color si se especifica
    if (isPositive !== null) {
        valueEl.classList.add(isPositive ? 'positive' : 'negative');
    }
    
    // Formatear valor
    valueEl.textContent = showSign 
        ? formatCurrencyWithSign(value, showSign)
        : formatCurrency(value);
    
    card.appendChild(valueEl);

    return card;
}
