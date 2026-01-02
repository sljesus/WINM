import { getLineConfig } from '../utils/chartConfig.js';

let chartInstance = null;

export function createMonthlyTrendChart(containerId, chartData) {
    const container = document.createElement('div');
    container.className = 'chart-container chart-container--height-trend chart-container--span-full';
    container.id = `chart-container-${containerId}`;
    
    const title = document.createElement('h3');
    title.className = 'chart-container__title';
    title.textContent = 'Tendencias Mensuales';
    container.appendChild(title);
    
    const canvas = document.createElement('canvas');
    canvas.className = 'chart-container__canvas';
    canvas.id = `chart-${containerId}`;
    container.appendChild(canvas);
    
    if (!chartData?.labels?.length) {
        const noDataMsg = document.createElement('p');
        noDataMsg.className = 'loading';
        noDataMsg.textContent = 'No hay datos disponibles';
        container.appendChild(noDataMsg);
        return container;
    }
    
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está cargado');
        const errorMsg = document.createElement('p');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Error: Chart.js no está disponible';
        container.appendChild(errorMsg);
        return container;
    }
    
    const ctx = canvas.getContext('2d');
    const config = {
        type: 'line',
        data: chartData,
        options: {
            ...getLineConfig(),
            plugins: {
                ...getLineConfig().plugins,
                tooltip: {
                    ...getLineConfig().plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y !== undefined ? context.parsed.y : context.raw;
                            return `${label}: ${formatCurrency(value)}`;
                        }
                    }
                }
            },
            scales: {
                ...getLineConfig().scales,
                y: {
                    ...getLineConfig().scales.y,
                    ticks: {
                        ...getLineConfig().scales.y.ticks,
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    };
    
    chartInstance = new Chart(ctx, config);
    return container;
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(value));
}

/**
 * Destruye la instancia del gráfico
 */
export function destroyMonthlyTrendChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}
