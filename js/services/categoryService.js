// Servicio de Categorías
// Principio SOLID: Responsabilidad única - Lógica de negocio de categorías

import { getSupabaseClient } from './supabaseService.js';

/**
 * Carga todas las categorías (sistema + personalizadas del usuario)
 * @returns {Promise<Array>} Array de categorías
 */
export async function loadCategories() {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // SELECT desde categories
        // Filtrar: is_system = true OR user_id = current_user
        // Ordenar: is_system DESC, name ASC
        // Patrón igual a getCategories() en transactionService.js
        const { data, error } = await client
            .from('categories')
            .select('id, name, icon, color, is_system, user_id, created_at')
            .or(`is_system.eq.true,user_id.eq.${user.id}`)
            .order('is_system', { ascending: false })
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error cargando categorías:', error);
        throw error;
    }
}

/**
 * Crea una nueva categoría personalizada
 * @param {Object} categoryData - Datos de la categoría
 * @param {string} categoryData.name - Nombre de la categoría
 * @param {string} categoryData.icon - Icono (opcional)
 * @param {string} categoryData.color - Color hex (opcional)
 * @returns {Promise<Object>} Categoría creada
 */
export async function createCategory(categoryData) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Validar datos básicos
        if (!categoryData.name || categoryData.name.trim() === '') {
            throw new Error('El nombre de la categoría es requerido');
        }

        // Validar formato de color si se proporciona
        if (categoryData.color && categoryData.color.trim() !== '') {
            const colorRegex = /^#[0-9A-Fa-f]{6}$/;
            if (!colorRegex.test(categoryData.color)) {
                throw new Error('El color debe estar en formato hex (#RRGGBB)');
            }
        }

        // INSERT en tabla categories
        // Validar: is_system = FALSE, user_id = current_user
        const { data, error } = await client
            .from('categories')
            .insert({
                user_id: user.id,
                name: categoryData.name.trim(),
                icon: categoryData.icon?.trim() || null,
                color: categoryData.color?.trim() || null,
                is_system: false
            })
            .select('*')
            .single();

        if (error) {
            // Manejar error de constraint único
            if (error.code === '23505') {
                throw new Error('Ya existe una categoría con ese nombre');
            }
            // Manejar error de validación de color
            if (error.code === '23514') {
                throw new Error('El formato del color no es válido');
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creando categoría:', error);
        throw error;
    }
}

/**
 * Actualiza una categoría personalizada
 * @param {string} categoryId - ID de la categoría
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Categoría actualizada
 */
export async function updateCategory(categoryId, updates) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Preparar datos de actualización
        const updateData = {};
        
        if (updates.name !== undefined) {
            if (!updates.name || updates.name.trim() === '') {
                throw new Error('El nombre de la categoría es requerido');
            }
            updateData.name = updates.name.trim();
        }
        
        if (updates.icon !== undefined) {
            updateData.icon = updates.icon?.trim() || null;
        }
        
        if (updates.color !== undefined) {
            if (updates.color && updates.color.trim() !== '') {
                const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                if (!colorRegex.test(updates.color)) {
                    throw new Error('El color debe estar en formato hex (#RRGGBB)');
                }
                updateData.color = updates.color.trim();
            } else {
                updateData.color = null;
            }
        }

        // UPDATE en tabla categories
        // Solo categorías personalizadas (is_system = FALSE)
        const { data, error } = await client
            .from('categories')
            .update(updateData)
            .eq('id', categoryId)
            .eq('user_id', user.id)
            .eq('is_system', false) // Solo permitir actualizar categorías personalizadas
            .select('*')
            .single();

        if (error) {
            // Manejar error de constraint único
            if (error.code === '23505') {
                throw new Error('Ya existe una categoría con ese nombre');
            }
            // Manejar error de validación de color
            if (error.code === '23514') {
                throw new Error('El formato del color no es válido');
            }
            // Si no se encontró la categoría, puede ser que sea del sistema o no exista
            if (error.code === 'PGRST116') {
                throw new Error('No se puede editar esta categoría. Solo se pueden editar categorías personalizadas.');
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        throw error;
    }
}

/**
 * Elimina una categoría personalizada
 * @param {string} categoryId - ID de la categoría
 * @returns {Promise<void>}
 */
export async function deleteCategory(categoryId) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // DELETE de tabla categories
        // Solo categorías personalizadas (is_system = FALSE)
        // Las transacciones que usan esta categoría se manejan con ON DELETE SET NULL en la FK
        const { error } = await client
            .from('categories')
            .delete()
            .eq('id', categoryId)
            .eq('user_id', user.id)
            .eq('is_system', false); // Solo permitir eliminar categorías personalizadas

        if (error) {
            // Si no se encontró la categoría, puede ser que sea del sistema o no exista
            if (error.code === 'PGRST116') {
                throw new Error('No se puede eliminar esta categoría. Solo se pueden eliminar categorías personalizadas.');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error eliminando categoría:', error);
        throw error;
    }
}

/**
 * Obtiene estadísticas de uso de una categoría
 * @param {string} categoryId - ID de la categoría
 * @returns {Promise<Object>} Estadísticas (totalSpent, transactionCount)
 */
export async function getCategoryStats(categoryId) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // SELECT COUNT y SUM desde transactions
        // Agrupar por category_id
        // Solo gastos (amount < 0)
        const { data, error } = await client
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category_id', categoryId)
            .lt('amount', 0); // Solo gastos

        if (error) throw error;

        // Calcular estadísticas
        const transactions = data || [];
        const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
        const transactionCount = transactions.length;

        return {
            totalSpent,
            transactionCount
        };
    } catch (error) {
        console.error('Error obteniendo estadísticas de categoría:', error);
        throw error;
    }
}
