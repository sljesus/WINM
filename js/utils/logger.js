// Sistema de logging con niveles
// Reduce ruido en consola y hace errores más claros

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// Nivel por defecto: solo WARN y ERROR en producción
let currentLogLevel = LOG_LEVELS.WARN;

// Detectar si estamos en desarrollo (localhost)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    currentLogLevel = LOG_LEVELS.DEBUG; // Mostrar todo en desarrollo
}

/**
 * Logger con niveles
 */
export const logger = {
    debug: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.DEBUG) {
            console.debug('🔍 [DEBUG]', ...args);
        }
    },
    
    info: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.INFO) {
            console.info('ℹ️ [INFO]', ...args);
        }
    },
    
    warn: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.WARN) {
            console.warn('⚠️ [WARN]', ...args);
        }
    },
    
    error: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.ERROR) {
            console.error('❌ [ERROR]', ...args);
        }
    },
    
    success: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.INFO) {
            console.log('✅ [SUCCESS]', ...args);
        }
    },
    
    /**
     * Establece el nivel de logging
     * @param {string} level - 'DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'
     */
    setLevel: (level) => {
        if (LOG_LEVELS[level] !== undefined) {
            currentLogLevel = LOG_LEVELS[level];
        }
    },
    
    /**
     * Obtiene el nivel actual
     */
    getLevel: () => {
        return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLogLevel);
    }
};

// Permitir cambiar el nivel desde la consola del navegador
window.logger = logger;
