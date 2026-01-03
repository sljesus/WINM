// Servicio de Tokens de Gmail API
// Principio SOLID: Responsabilidad única - Gestión de tokens de Gmail API
// KISS: Wrapper simple sobre funciones de supabaseService

import { getProviderToken, getProviderRefreshToken } from './supabaseService.js';

/**
 * Verifica si la sesión actual tiene acceso a Gmail API
 * @returns {Promise<boolean>} True si tiene acceso a Gmail API
 */
export async function hasGmailAccess() {
    const token = await getProviderToken();
    return !!token;
}

/**
 * Obtiene el token de acceso a Gmail API
 * @returns {Promise<string|null>} Token de acceso o null si no está disponible
 */
export async function getGmailToken() {
    return await getProviderToken();
}

/**
 * Obtiene el refresh token de Gmail API
 * @returns {Promise<string|null>} Refresh token o null si no está disponible
 */
export async function getGmailRefreshToken() {
    return await getProviderRefreshToken();
}
