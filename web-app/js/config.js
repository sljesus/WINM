// Configuración de WINM
// Editar estos valores con tus credenciales de Supabase

const CONFIG = {
    supabase: {
        url: 'https://ioixblxanqcacqzlijps.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvaXhibHhhbnFjYWNxemxpanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMjM0NjgsImV4cCI6MjA4Mjc5OTQ2OH0.9D4BGhqFOZpYblg7jWpRs-j-p4wPQd_Grdm9PMIQFOM'
    }
};

// Hacer CONFIG disponible globalmente para módulos ES6
window.CONFIG = CONFIG;

// Validar que la configuración esté completa
if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
    console.warn('⚠️ Configuración de Supabase incompleta. Edita web-app/js/config.js con tus credenciales.');
}
