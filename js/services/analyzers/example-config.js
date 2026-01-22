// Ejemplo de configuración para habilitar análisis con IA
// Copia estas configuraciones a js/config.js

// Configuración 1: Solo Regex (Gratis, Rápido)
const CONFIG_REGEX_ONLY = {
    supabase: {
        url: 'https://ioixblxanqcacqzlijps.supabase.co',
        anonKey: 'tu-anon-key'
    },
    ai: {
        useOpenAI: false,  // ❌ IA deshabilitada
        useRegex: true     // ✅ Regex habilitado
    }
};

// Configuración 2: Regex + OpenAI (Recomendado)
const CONFIG_WITH_AI = {
    supabase: {
        url: 'https://ioixblxanqcacqzlijps.supabase.co',
        anonKey: 'tu-anon-key'
    },
    ai: {
        useOpenAI: true,   // ✅ IA habilitada
        openaiApiKey: 'sk-your-openai-api-key-here', // ⚠️ Reemplaza con tu key real
        useRegex: true,    // ✅ Regex como respaldo
        model: 'gpt-3.5-turbo' // gpt-3.5-turbo (barato) o gpt-4 (mejor)
    }
};

// Configuración 3: Solo OpenAI (Para testing)
const CONFIG_AI_ONLY = {
    supabase: {
        url: 'https://ioixblxanqcacqzlijps.supabase.co',
        anonKey: 'tu-anon-key'
    },
    ai: {
        useOpenAI: true,
        openaiApiKey: 'sk-your-openai-api-key-here',
        useRegex: false,   // ❌ Sin regex
        model: 'gpt-4'     // Mejor precisión
    }
};

// INSTRUCCIONES:
// 1. Copia una de las configuraciones arriba
// 2. Pégala en js/config.js reemplazando la configuración existente
// 3. Si usas OpenAI, reemplaza 'sk-your-openai-api-key-here' con tu API key real
// 4. Reinicia la aplicación

// COSTOS APROXIMADOS:
// - Regex: $0.00
// - GPT-3.5-turbo: $0.002 por email
// - GPT-4: $0.03 por email

export { CONFIG_REGEX_ONLY, CONFIG_WITH_AI, CONFIG_AI_ONLY };