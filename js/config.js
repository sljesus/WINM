// Configuración de WINM
// Editar estos valores con tus credenciales de Supabase

console.log('🔧 Cargando config.js...');

const CONFIG = {
    supabase: {
        url: 'https://ioixblxanqcacqzlijps.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvaXhibHhhbnFjYWNxemxpanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMjM0NjgsImV4cCI6MjA4Mjc5OTQ2OH0.9D4BGhqFOZpYblg7jWpRs-j-p4wPQd_Grdm9PMIQFOM'
    },

    // Configuración de análisis de emails con IA (KISS: configuración simple)
    ai: {
        // Habilitar análisis con OpenAI (false = solo regex)
        // La API key ahora está segura en Supabase Edge Functions (secrets)
        useOpenAI: true, // Cambiar a true para habilitar IA

        // API Key ya no se necesita aquí - está en Supabase Edge Functions
        // openaiApiKey: null, // Deprecated: ahora se usa Edge Function segura

        // Usar regex como base (recomendado: true)
        useRegex: true,

        // Configuración avanzada
        maxRetries: 2,
        timeout: 10000, // ms
        model: 'gpt-3.5-turbo' // o 'gpt-4' para mejor precisión
    }
};

// Hacer CONFIG disponible globalmente para módulos ES6
window.CONFIG = CONFIG;

// Validar que la configuración esté completa
if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
    console.warn('⚠️ Configuración de Supabase incompleta. Edita js/config.js con tus credenciales.');
}
