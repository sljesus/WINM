// Configuración responsive para Chart.js
// Principio SOLID: Responsabilidad única - Configuración centralizada

/**
 * Detecta si estamos en móvil
 * @returns {boolean}
 */
function isMobile() {
    return window.innerWidth < 768;
}

/**
 * Detecta si estamos en tablet
 * @returns {boolean}
 */
function isTablet() {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
}

/**
 * Obtiene configuración optimizada de tooltips para móvil
 * @returns {Object} Configuración de tooltips
 */
export function getMobileTooltipConfig() {
    return {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: isMobile() ? 12 : 10,
        titleFont: {
            size: isMobile() ? 14 : 13
        },
        bodyFont: {
            size: isMobile() ? 13 : 12
        },
        caretSize: isMobile() ? 8 : 5,
        cornerRadius: isMobile() ? 8 : 6,
        interaction: {
            intersect: false,
            mode: 'nearest'
        },
        callbacks: {
            label: function(context) {
                const label = context.label || '';
                const value = context.parsed !== undefined ? context.parsed : context.raw;
                return `${label}: ${formatCurrency(value)}`;
            }
        }
    };
}

/**
 * Obtiene configuración optimizada de leyenda para móvil
 * @returns {Object} Configuración de leyenda
 */
export function getMobileLegendConfig() {
    return {
        position: isMobile() ? 'bottom' : 'right',
        labels: {
            padding: isMobile() ? 8 : 15,
            font: {
                size: isMobile() ? 10 : 12
            },
            usePointStyle: true,
            boxWidth: isMobile() ? 6 : 10,
            maxWidth: isMobile() ? 100 : undefined
        },
        fullSize: !isMobile()
    };
}

/**
 * Obtiene configuración responsive común para todos los gráficos
 * @returns {Object} Configuración común
 */
export function getCommonConfig() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: getMobileLegendConfig(),
            tooltip: getMobileTooltipConfig()
        }
    };
}

/**
 * Formatea un valor como moneda MXN
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(value));
}

/**
 * Obtiene configuración específica para gráficos doughnut/pie
 * @returns {Object} Configuración para doughnut charts
 */
export function getDoughnutConfig() {
    return {
        ...getCommonConfig(),
        cutout: isMobile() ? '60%' : '70%',
        plugins: {
            ...getCommonConfig().plugins,
            legend: {
                ...getCommonConfig().plugins.legend,
                position: isMobile() ? 'bottom' : 'right'
            }
        }
    };
}

/**
 * Obtiene configuración específica para gráficos de línea
 * @returns {Object} Configuración para line charts
 */
export function getLineConfig() {
    return {
        ...getCommonConfig(),
        interaction: {
            intersect: false,
            mode: 'nearest' // Mejor para touch en móvil
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: isMobile() ? 11 : 12
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        size: isMobile() ? 11 : 12
                    },
                    callback: function(value) {
                        if (value >= 1000) {
                            return '$' + (value / 1000).toFixed(1) + 'k';
                        }
                        return '$' + value;
                    }
                }
            }
        }
    };
}

/**
 * Obtiene configuración específica para gráficos de barras
 * @returns {Object} Configuración para bar charts
 */
export function getBarConfig() {
    return {
        ...getCommonConfig(),
        indexAxis: 'y',
        interaction: {
            intersect: false,
            mode: 'nearest' // Mejor para touch en móvil
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        size: isMobile() ? 11 : 12
                    },
                    callback: function(value) {
                        if (value >= 1000) {
                            return '$' + (value / 1000).toFixed(1) + 'k';
                        }
                        return '$' + value;
                    }
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: isMobile() ? 11 : 12
                    }
                }
            }
        }
    };
}

/**
 * Paleta de colores por defecto para gráficos
 */
export const DEFAULT_COLORS = [
    '#3b82f6', // azul
    '#10b981', // verde
    '#f59e0b', // amarillo
    '#ef4444', // rojo
    '#8b5cf6', // púrpura
    '#ec4899', // rosa
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // naranja
    '#6366f1'  // índigo
];

/**
 * Genera colores para un número específico de categorías
 * @param {number} count - Número de categorías
 * @param {Array<string>} customColors - Colores personalizados (opcional)
 * @returns {Array<string>} Array de colores
 */
export function generateColors(count, customColors = []) {
    const colors = [];
    const palette = customColors.length > 0 ? customColors : DEFAULT_COLORS;
    
    for (let i = 0; i < count; i++) {
        colors.push(palette[i % palette.length]);
    }
    
    return colors;
}

/**
 * Obtiene un color único para la categoría "Otros"
 * Este color es diferente de los colores de la paleta por defecto
 * @returns {string} Color hexadecimal para "Otros"
 */
export function getOthersColor() {
    return '#94a3b8'; // slate-400 - gris neutro distintivo
}
