// Servicio de Reglas de Auto-categorización
// Principio SOLID: Responsabilidad única - Lógica de negocio de reglas

import { getSupabaseClient } from './supabaseService.js';

/**
 * Tipos de regla permitidos
 */
const VALID_RULE_TYPES = ['contains', 'starts_with', 'ends_with', 'regex', 'exact_match'];

/**
 * Carga todas las reglas del usuario con JOIN a categories
 * @returns {Promise<Array>} Array de reglas con datos de categoría
 */
export async function loadRules() {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // SELECT desde categorization_rules con JOIN a categories
        // Ordenar por priority ASC (menor número = mayor prioridad), luego por created_at
        const { data, error } = await client
            .from('categorization_rules')
            .select(`
                id,
                user_id,
                category_id,
                rule_type,
                pattern,
                is_case_sensitive,
                priority,
                is_active,
                match_count,
                created_at,
                updated_at,
                categories!inner(
                    id,
                    name,
                    icon,
                    color
                )
            `)
            .eq('user_id', user.id)
            .order('priority', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error cargando reglas:', error);
        throw error;
    }
}

/**
 * Crea una nueva regla de auto-categorización
 * @param {Object} ruleData - Datos de la regla
 * @param {string} ruleData.category_id - ID de la categoría
 * @param {string} ruleData.rule_type - Tipo de regla (contains, starts_with, ends_with, regex, exact_match)
 * @param {string} ruleData.pattern - Patrón a buscar
 * @param {boolean} ruleData.is_case_sensitive - Si distingue mayúsculas/minúsculas
 * @param {number} ruleData.priority - Prioridad (menor = mayor prioridad, default 100)
 * @param {boolean} ruleData.is_active - Si está activa (default true)
 * @returns {Promise<Object>} Regla creada
 */
export async function createRule(ruleData) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Validar datos básicos
        if (!ruleData.category_id) {
            throw new Error('La categoría es requerida');
        }

        if (!ruleData.rule_type || !VALID_RULE_TYPES.includes(ruleData.rule_type)) {
            throw new Error(`El tipo de regla debe ser uno de: ${VALID_RULE_TYPES.join(', ')}`);
        }

        if (!ruleData.pattern || ruleData.pattern.trim() === '') {
            throw new Error('El patrón es requerido');
        }

        // Validar prioridad
        const priority = ruleData.priority !== undefined ? parseInt(ruleData.priority) : 100;
        if (isNaN(priority) || priority < 0) {
            throw new Error('La prioridad debe ser un número mayor o igual a 0');
        }

        // Validar regex si el tipo es 'regex'
        if (ruleData.rule_type === 'regex') {
            try {
                // Intentar crear una expresión regular para validar
                new RegExp(ruleData.pattern);
            } catch (regexError) {
                throw new Error('El patrón regex no es válido: ' + regexError.message);
            }
        }

        // INSERT en tabla categorization_rules
        const { data, error } = await client
            .from('categorization_rules')
            .insert({
                user_id: user.id,
                category_id: ruleData.category_id,
                rule_type: ruleData.rule_type,
                pattern: ruleData.pattern.trim(),
                is_case_sensitive: ruleData.is_case_sensitive || false,
                priority: priority,
                is_active: ruleData.is_active !== undefined ? ruleData.is_active : true,
                match_count: 0
            })
            .select(`
                *,
                categories!inner(
                    id,
                    name,
                    icon,
                    color
                )
            `)
            .single();

        if (error) {
            // Manejar error de validación de regex (trigger de BD)
            if (error.code === 'P0001' || error.message?.includes('regex')) {
                throw new Error('El patrón regex no es válido');
            }
            // Manejar error de constraint
            if (error.code === '23503') {
                throw new Error('La categoría seleccionada no existe');
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creando regla:', error);
        throw error;
    }
}

/**
 * Actualiza una regla existente
 * @param {string} ruleId - ID de la regla
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Regla actualizada
 */
export async function updateRule(ruleId, updates) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Preparar datos de actualización
        const updateData = {};
        
        if (updates.category_id !== undefined) {
            if (!updates.category_id) {
                throw new Error('La categoría es requerida');
            }
            updateData.category_id = updates.category_id;
        }
        
        if (updates.rule_type !== undefined) {
            if (!VALID_RULE_TYPES.includes(updates.rule_type)) {
                throw new Error(`El tipo de regla debe ser uno de: ${VALID_RULE_TYPES.join(', ')}`);
            }
            updateData.rule_type = updates.rule_type;
        }
        
        if (updates.pattern !== undefined) {
            if (!updates.pattern || updates.pattern.trim() === '') {
                throw new Error('El patrón es requerido');
            }
            updateData.pattern = updates.pattern.trim();
        }
        
        if (updates.is_case_sensitive !== undefined) {
            updateData.is_case_sensitive = updates.is_case_sensitive;
        }
        
        if (updates.priority !== undefined) {
            const priority = parseInt(updates.priority);
            if (isNaN(priority) || priority < 0) {
                throw new Error('La prioridad debe ser un número mayor o igual a 0');
            }
            updateData.priority = priority;
        }
        
        if (updates.is_active !== undefined) {
            updateData.is_active = updates.is_active;
        }

        // Validar regex si se actualiza el patrón y el tipo es regex
        if (updateData.pattern && (updates.rule_type === 'regex' || !updates.rule_type)) {
            // Necesitamos obtener el tipo actual si no se está actualizando
            if (!updates.rule_type) {
                const { data: currentRule } = await client
                    .from('categorization_rules')
                    .select('rule_type')
                    .eq('id', ruleId)
                    .eq('user_id', user.id)
                    .single();
                
                if (currentRule?.rule_type === 'regex') {
                    try {
                        new RegExp(updateData.pattern);
                    } catch (regexError) {
                        throw new Error('El patrón regex no es válido: ' + regexError.message);
                    }
                }
            } else if (updates.rule_type === 'regex') {
                try {
                    new RegExp(updateData.pattern);
                } catch (regexError) {
                    throw new Error('El patrón regex no es válido: ' + regexError.message);
                }
            }
        }

        // UPDATE en tabla categorization_rules
        const { data, error } = await client
            .from('categorization_rules')
            .update(updateData)
            .eq('id', ruleId)
            .eq('user_id', user.id)
            .select(`
                *,
                categories!inner(
                    id,
                    name,
                    icon,
                    color
                )
            `)
            .single();

        if (error) {
            // Manejar error de validación de regex
            if (error.code === 'P0001' || error.message?.includes('regex')) {
                throw new Error('El patrón regex no es válido');
            }
            // Si no se encontró la regla
            if (error.code === 'PGRST116') {
                throw new Error('Regla no encontrada o no tienes permisos para editarla');
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error actualizando regla:', error);
        throw error;
    }
}

/**
 * Elimina una regla
 * @param {string} ruleId - ID de la regla
 * @returns {Promise<void>}
 */
export async function deleteRule(ruleId) {
    try {
        const client = getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // DELETE de tabla categorization_rules
        const { error } = await client
            .from('categorization_rules')
            .delete()
            .eq('id', ruleId)
            .eq('user_id', user.id);

        if (error) {
            // Si no se encontró la regla
            if (error.code === 'PGRST116') {
                throw new Error('Regla no encontrada o no tienes permisos para eliminarla');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error eliminando regla:', error);
        throw error;
    }
}

/**
 * Activa o desactiva una regla
 * @param {string} ruleId - ID de la regla
 * @param {boolean} isActive - Nuevo estado (true = activa, false = inactiva)
 * @returns {Promise<Object>} Regla actualizada
 */
export async function toggleRuleActive(ruleId, isActive) {
    try {
        return await updateRule(ruleId, { is_active: isActive });
    } catch (error) {
        console.error('Error cambiando estado de regla:', error);
        throw error;
    }
}
