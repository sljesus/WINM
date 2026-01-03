// Servicio de Presupuestos
// Principio SOLID: Responsabilidad única - Lógica de negocio de presupuestos

import { getSupabaseClient } from './supabaseService.js';

/**
 * Carga presupuestos activos usando vista budget_summary
 * @returns {Promise<Array>} Array de presupuestos con datos calculados
 */
export async function loadBudgets() {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Consultar tabla budgets directamente con JOIN a categories
        // Luego calcularemos los valores usando get_budget_spent
        const { data: budgets, error } = await client
            .from('budgets')
            .select(`
                id,
                user_id,
                category_id,
                amount,
                period_type,
                period_start,
                period_end,
                alert_threshold,
                is_active,
                created_at,
                categories!inner(
                    id,
                    name,
                    icon,
                    color
                )
            `)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('period_start', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!budgets || budgets.length === 0) {
            return [];
        }

        // Calcular current_spent, percentage_used y status para cada presupuesto
        // usando la función RPC get_budget_spent
        const budgetsWithStats = await Promise.all(
            budgets.map(async (budget) => {
                try {
                    // Llamar a la función RPC get_budget_spent
                    const { data: spent, error: spentError } = await client.rpc('get_budget_spent', {
                        p_user_id: budget.user_id,
                        p_category_id: budget.category_id,
                        p_period_start: budget.period_start,
                        p_period_end: budget.period_end
                    });

                    const current_spent = spentError ? 0 : (spent || 0);
                    const budget_amount = parseFloat(budget.amount || 0);
                    const percentage_used = budget_amount > 0 
                        ? Math.round((current_spent / budget_amount) * 100 * 100) / 100 
                        : 0;

                    // Calcular status
                    let status = 'ok';
                    if (current_spent >= budget_amount) {
                        status = 'exceeded';
                    } else if (percentage_used >= budget.alert_threshold) {
                        status = 'threshold';
                    }

                    return {
                        id: budget.id,
                        user_id: budget.user_id,
                        category_id: budget.category_id,
                        category_name: budget.categories?.name || 'Sin categoría',
                        budget_amount: budget_amount,
                        current_spent: current_spent,
                        percentage_used: percentage_used,
                        period_type: budget.period_type,
                        period_start: budget.period_start,
                        period_end: budget.period_end,
                        alert_threshold: budget.alert_threshold,
                        is_active: budget.is_active,
                        status: status,
                        created_at: budget.created_at
                    };
                } catch (err) {
                    console.error(`Error calculando stats para presupuesto ${budget.id}:`, err);
                    // Retornar presupuesto con valores por defecto si falla el cálculo
                    return {
                        id: budget.id,
                        user_id: budget.user_id,
                        category_id: budget.category_id,
                        category_name: budget.categories?.name || 'Sin categoría',
                        budget_amount: parseFloat(budget.amount || 0),
                        current_spent: 0,
                        percentage_used: 0,
                        period_type: budget.period_type,
                        period_start: budget.period_start,
                        period_end: budget.period_end,
                        alert_threshold: budget.alert_threshold,
                        is_active: budget.is_active,
                        status: 'ok',
                        created_at: budget.created_at
                    };
                }
            })
        );

        return budgetsWithStats;
    } catch (error) {
        console.error('Error cargando presupuestos:', error);
        throw error;
    }
}

/**
 * Carga alertas de presupuesto no leídas
 * @returns {Promise<Array>} Array de alertas con información del presupuesto
 */
export async function loadBudgetAlerts() {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // SELECT desde budget_alerts con JOIN a budgets y categories
        const { data, error } = await client
            .from('budget_alerts')
            .select(`
                *,
                budgets!inner(
                    id,
                    category_id,
                    amount,
                    period_type,
                    period_start,
                    period_end,
                    categories!inner(
                        id,
                        name,
                        icon,
                        color
                    )
                )
            `)
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error cargando alertas de presupuesto:', error);
        throw error;
    }
}

/**
 * Crea un nuevo presupuesto
 * @param {Object} budgetData - Datos del presupuesto
 * @param {string} budgetData.category_id - ID de la categoría
 * @param {number} budgetData.amount - Monto del presupuesto
 * @param {string} budgetData.period_type - Tipo de período (mensual, semanal, anual)
 * @param {string} budgetData.period_start - Fecha de inicio (YYYY-MM-DD)
 * @param {string} budgetData.period_end - Fecha de fin (YYYY-MM-DD)
 * @param {number} budgetData.alert_threshold - Porcentaje de alerta (0-100)
 * @returns {Promise<Object>} Presupuesto creado
 */
export async function createBudget(budgetData) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Validar datos básicos
        if (!budgetData.category_id || !budgetData.amount || !budgetData.period_start || !budgetData.period_end) {
            throw new Error('Faltan campos requeridos');
        }

        if (parseFloat(budgetData.amount) <= 0) {
            throw new Error('El monto debe ser mayor a 0');
        }

        // INSERT en tabla budgets
        const { data, error } = await client
            .from('budgets')
            .insert({
                user_id: user.id,
                category_id: budgetData.category_id,
                amount: parseFloat(budgetData.amount),
                period_type: budgetData.period_type || 'mensual',
                period_start: budgetData.period_start,
                period_end: budgetData.period_end,
                alert_threshold: budgetData.alert_threshold || 80,
                is_active: true
            })
            .select('*')
            .single();

        if (error) {
            // Manejar error de constraint único
            if (error.code === '23505') {
                throw new Error('Ya existe un presupuesto activo para esta categoría en el período seleccionado');
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creando presupuesto:', error);
        throw error;
    }
}

/**
 * Actualiza un presupuesto existente
 * @param {string} budgetId - ID del presupuesto
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Presupuesto actualizado
 */
export async function updateBudget(budgetId, updates) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Preparar datos de actualización
        const updateData = {};
        
        if (updates.amount !== undefined) {
            if (parseFloat(updates.amount) <= 0) {
                throw new Error('El monto debe ser mayor a 0');
            }
            updateData.amount = parseFloat(updates.amount);
        }
        
        if (updates.period_type !== undefined) {
            updateData.period_type = updates.period_type;
        }
        
        if (updates.period_start !== undefined) {
            updateData.period_start = updates.period_start;
        }
        
        if (updates.period_end !== undefined) {
            updateData.period_end = updates.period_end;
        }
        
        if (updates.alert_threshold !== undefined) {
            const threshold = parseFloat(updates.alert_threshold);
            if (threshold < 0 || threshold > 100) {
                throw new Error('El porcentaje de alerta debe estar entre 0 y 100');
            }
            updateData.alert_threshold = threshold;
        }

        // UPDATE en tabla budgets
        const { data, error } = await client
            .from('budgets')
            .update(updateData)
            .eq('id', budgetId)
            .eq('user_id', user.id)
            .select('*')
            .single();

        if (error) {
            // Manejar error de constraint único
            if (error.code === '23505') {
                throw new Error('Ya existe un presupuesto activo para esta categoría en el período seleccionado');
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error actualizando presupuesto:', error);
        throw error;
    }
}

/**
 * Desactiva un presupuesto (soft delete)
 * @param {string} budgetId - ID del presupuesto
 * @returns {Promise<void>}
 */
export async function deleteBudget(budgetId) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // UPDATE is_active = false (NO DELETE físico - backward compatible)
        const { error } = await client
            .from('budgets')
            .update({ is_active: false })
            .eq('id', budgetId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error desactivando presupuesto:', error);
        throw error;
    }
}

/**
 * Marca una alerta como leída
 * @param {string} alertId - ID de la alerta
 * @returns {Promise<void>}
 */
export async function markAlertAsRead(alertId) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // UPDATE is_read = true
        const { error } = await client
            .from('budget_alerts')
            .update({ is_read: true })
            .eq('id', alertId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error marcando alerta como leída:', error);
        throw error;
    }
}
