// Servicio de Datos para Gráficos
// Principio SOLID: Responsabilidad única - Preparar datos para visualizaciones

import { getSupabaseClient, getCurrentUser } from './supabaseService.js';
import { getMonthStart, getMonthEnd, formatDate } from '../utils/dateFormatter.js';
import { generateColors, getOthersColor } from '../utils/chartConfig.js';

/**
 * Obtiene datos de gastos por categoría usando RPC get_category_expenses
 * @param {string} userId - ID del usuario
 * @param {Date|string} startDate - Fecha de inicio
 * @param {Date|string} endDate - Fecha de fin
 * @param {number} maxCategories - Máximo de categorías a mostrar (default: 8)
 * @returns {Promise<Object>} Datos formateados para Chart.js doughnut/bar
 */
export async function getCategoryExpensesData(userId, startDate, endDate, maxCategories = 8) {
    try {
        const client = getSupabaseClient();
        
        // Convertir fechas a formato DATE si son objetos Date
        const start = startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate;
        const end = endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate;
        
        // Llamar RPC get_category_expenses
        const { data, error } = await client.rpc('get_category_expenses', {
            p_user_id: userId,
            p_start_date: start,
            p_end_date: end
        });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return {
                labels: ['Sin datos'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e2e8f0']
                }]
            };
        }
        
        // Ordenar por monto descendente
        const sorted = [...data].sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount));
        
        // Tomar top N categorías y agrupar el resto como "Otros"
        const topCategories = sorted.slice(0, maxCategories - 1);
        const others = sorted.slice(maxCategories - 1);
        
        const labels = topCategories.map(cat => cat.category_name || 'Sin categoría');
        const amounts = topCategories.map(cat => parseFloat(cat.total_amount || 0));
        
        // Obtener colores de categorías si están disponibles
        const colors = await getCategoryColors(topCategories.map(cat => cat.category_id));
        
        // Agregar "Otros" si hay más categorías
        if (others.length > 0) {
            const othersTotal = others.reduce((sum, cat) => sum + parseFloat(cat.total_amount || 0), 0);
            if (othersTotal > 0) {
                labels.push('Otros');
                amounts.push(othersTotal);
                // Agregar color único para "Otros" que no está en la paleta por defecto
                colors.push(getOthersColor());
            }
        }
        
        return {
            labels,
            datasets: [{
                data: amounts,
                backgroundColor: colors
            }]
        };
    } catch (error) {
        console.error('Error obteniendo datos de categorías:', error);
        throw error;
    }
}

/**
 * Obtiene datos de tendencias mensuales (ingresos y gastos)
 * @param {string} userId - ID del usuario
 * @param {number} months - Número de meses a mostrar (default: 6)
 * @returns {Promise<Object>} Datos formateados para Chart.js line chart
 */
export async function getMonthlyTrendsData(userId, months = 6) {
    try {
        const client = getSupabaseClient();
        
        // Calcular fechas de inicio y fin
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(1); // Primer día del mes
        
        // Obtener transacciones del período
        const { data: transactions, error } = await client
            .from('transactions')
            .select('amount, date')
            .eq('user_id', userId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: true });
        
        if (error) throw error;
        
        // Agrupar por mes
        const monthlyData = {};
        
        // Inicializar todos los meses en el rango
        for (let i = 0; i < months; i++) {
            const date = new Date(startDate);
            date.setMonth(date.getMonth() + i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = {
                income: 0,
                expenses: 0,
                monthName: formatDate(date, { month: 'short', year: 'numeric' })
            };
        }
        
        // Procesar transacciones
        if (transactions && transactions.length > 0) {
            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (monthlyData[monthKey]) {
                    const amount = parseFloat(transaction.amount || 0);
                    if (amount > 0) {
                        monthlyData[monthKey].income += amount;
                    } else {
                        monthlyData[monthKey].expenses += Math.abs(amount);
                    }
                }
            });
        }
        
        // Convertir a arrays ordenados
        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(key => monthlyData[key].monthName);
        const incomeData = sortedMonths.map(key => monthlyData[key].income);
        const expensesData = sortedMonths.map(key => monthlyData[key].expenses);
        
        return {
            labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Gastos',
                    data: expensesData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    } catch (error) {
        console.error('Error obteniendo datos de tendencias:', error);
        throw error;
    }
}

/**
 * Obtiene datos de top categorías ordenadas por gasto
 * @param {string} userId - ID del usuario
 * @param {number} limit - Número de categorías a mostrar (default: 5)
 * @param {Date|string} startDate - Fecha de inicio
 * @param {Date|string} endDate - Fecha de fin
 * @returns {Promise<Object>} Datos formateados para Chart.js bar chart horizontal
 */
export async function getTopCategoriesData(userId, limit = 5, startDate, endDate) {
    try {
        const client = getSupabaseClient();
        
        // Si no se proporcionan fechas, usar últimos 30 días
        if (!startDate || !endDate) {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
        }
        
        // Convertir fechas a formato DATE si son objetos Date
        const start = startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate;
        const end = endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate;
        
        // Llamar RPC get_category_expenses
        const { data, error } = await client.rpc('get_category_expenses', {
            p_user_id: userId,
            p_start_date: start,
            p_end_date: end
        });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return {
                labels: ['Sin datos'],
                datasets: [{
                    data: [0],
                    backgroundColor: ['#e2e8f0']
                }]
            };
        }
        
        // Ordenar por monto descendente y tomar top N
        const sorted = [...data].sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount));
        const topCategories = sorted.slice(0, limit);
        
        const labels = topCategories.map(cat => cat.category_name || 'Sin categoría');
        const amounts = topCategories.map(cat => parseFloat(cat.total_amount || 0));
        
        // Obtener colores de categorías
        const colors = await getCategoryColors(topCategories.map(cat => cat.category_id));
        
        return {
            labels,
            datasets: [{
                label: 'Gastos',
                data: amounts,
                backgroundColor: colors
            }]
        };
    } catch (error) {
        console.error('Error obteniendo datos de top categorías:', error);
        throw error;
    }
}

/**
 * Obtiene colores de categorías desde la base de datos
 * @param {Array<string>} categoryIds - Array de IDs de categorías
 * @returns {Promise<Array<string>>} Array de colores
 */
async function getCategoryColors(categoryIds) {
    try {
        if (!categoryIds || categoryIds.length === 0) {
            return generateColors(1);
        }
        
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('categories')
            .select('id, color')
            .in('id', categoryIds);
        
        if (error) throw error;
        
        // Crear mapa de ID -> color
        const colorMap = {};
        if (data) {
            data.forEach(cat => {
                colorMap[cat.id] = cat.color;
            });
        }
        
        // Generar colores en el mismo orden que categoryIds
        const colors = categoryIds.map(id => {
            return colorMap[id] || null;
        });
        
        // Rellenar colores faltantes con paleta por defecto
        const defaultColors = generateColors(colors.length);
        return colors.map((color, index) => color || defaultColors[index]);
    } catch (error) {
        console.error('Error obteniendo colores de categorías:', error);
        // Retornar colores por defecto en caso de error
        return generateColors(categoryIds.length);
    }
}
