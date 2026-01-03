// Servicio de Supabase
// Principio SOLID: Responsabilidad única - Gestión de cliente Supabase y autenticación
// Singleton pattern para el cliente

let supabaseClient = null;

/**
 * Obtiene el cliente de Supabase configurado (singleton)
 * @returns {Object} Cliente de Supabase
 */
export function getSupabaseClient() {
    if (!supabaseClient) {
        // CONFIG debe estar disponible globalmente desde config.js
        // config.js se carga antes que los módulos, así que CONFIG está en window
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        
        if (!config || !config.supabase || !config.supabase.url || !config.supabase.anonKey) {
            throw new Error('Configuración de Supabase incompleta. Verifica config.js');
        }

        // supabase está disponible globalmente desde el CDN
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase no está cargado. Verifica que el script de Supabase esté incluido.');
        }

        supabaseClient = supabase.createClient(
            config.supabase.url,
            config.supabase.anonKey
        );
    }
    
    return supabaseClient;
}

/**
 * Obtiene el usuario actual
 * @returns {Promise<Object|null>} Usuario actual o null
 */
export async function getCurrentUser() {
    try {
        const client = getSupabaseClient();
        const { data: { user }, error } = await client.auth.getUser();
        
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
        return null;
    }
}

/**
 * Verifica si hay una sesión activa
 * @returns {Promise<boolean>} True si hay sesión activa
 */
export async function checkSession() {
    try {
        const client = getSupabaseClient();
        const { data: { session }, error } = await client.auth.getSession();
        
        if (error) throw error;
        return !!session;
    } catch (error) {
        console.error('Error verificando sesión:', error);
        return false;
    }
}

/**
 * Obtiene la sesión actual
 * @returns {Promise<Object|null>} Sesión actual o null
 */
export async function getSession() {
    try {
        const client = getSupabaseClient();
        const { data: { session }, error } = await client.auth.getSession();
        
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Error obteniendo sesión:', error);
        return null;
    }
}

/**
 * Inicia sesión con Google OAuth solicitando acceso a Gmail API
 * @returns {Promise<Object>} Resultado del login OAuth
 */
export async function signInWithGoogle() {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/gmail.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                },
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error en login con Google:', error);
        return { data: null, error };
    }
}

/**
 * Obtiene el provider_token de la sesión actual
 * @returns {Promise<string|null>} Provider token o null
 */
export async function getProviderToken() {
    try {
        const session = await getSession();
        return session?.provider_token || null;
    } catch (error) {
        console.error('Error obteniendo provider token:', error);
        return null;
    }
}

/**
 * Obtiene el provider_refresh_token de la sesión actual
 * @returns {Promise<string|null>} Provider refresh token o null
 */
export async function getProviderRefreshToken() {
    try {
        const session = await getSession();
        return session?.provider_refresh_token || null;
    } catch (error) {
        console.error('Error obteniendo provider refresh token:', error);
        return null;
    }
}

/**
 * Inicia sesión con email y contraseña
 * @deprecated Usar signInWithGoogle() en su lugar. Mantenida para backward compatibility.
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} Resultado del login
 */
export async function signIn(email, password) {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error en login:', error);
        return { data: null, error };
    }
}

/**
 * Cierra sesión
 * @returns {Promise<Object>} Resultado del logout
 */
export async function signOut() {
    try {
        const client = getSupabaseClient();
        const { error } = await client.auth.signOut();

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error en logout:', error);
        return { error };
    }
}

/**
 * Escucha cambios en el estado de autenticación
 * @param {Function} callback - Función callback(event, session)
 * @returns {Function} Función para desuscribirse
 */
export function onAuthStateChange(callback) {
    const client = getSupabaseClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
    
    return () => subscription.unsubscribe();
}
