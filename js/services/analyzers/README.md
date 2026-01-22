# Sistema de Análisis de Emails con IA

Este módulo implementa un sistema de análisis de emails bancarios siguiendo los principios SOLID y KISS.

## Instalación

No se requiere instalación adicional. El sistema usa `fetch` nativo del navegador para comunicarse con la API de OpenAI.

## Arquitectura

### Principios SOLID Implementados

- **Single Responsibility**: Cada analizador tiene una responsabilidad única
- **Open/Closed**: Fácil agregar nuevos analizadores sin modificar código existente
- **Liskov Substitution**: Cualquier `IEmailAnalyzer` puede reemplazar a otro
- **Interface Segregation**: Interfaz mínima y específica
- **Dependency Inversion**: Depende de abstracciones, no implementaciones

### Componentes

#### 1. IEmailAnalyzer
Interfaz base que define el contrato para todos los analizadores.

#### 2. RegexEmailAnalyzer
Analizador que usa expresiones regulares. Es rápido y no tiene costos.

#### 3. OpenAIEmailAnalyzer
Analizador que usa OpenAI API. Más preciso pero tiene costos (~$0.002 por email).

#### 4. CompositeEmailAnalyzer
Combina múltiples analizadores. Intenta cada uno en orden hasta encontrar uno que funcione.

#### 5. EmailAnalyzerFactory
Crea instancias de analizadores basados en configuración.

## Configuración

### Configuración Básica (Solo Regex)

```javascript
// js/config.js
const CONFIG = {
    ai: {
        useOpenAI: false, // Solo regex
        useRegex: true
    }
};
```

### Configuración con OpenAI

```javascript
// js/config.js
const CONFIG = {
    ai: {
        useOpenAI: true,
        openaiApiKey: 'tu-api-key-de-openai', // ⚠️ Configurar con tu key real
        useRegex: true, // Recomendado: usar regex como respaldo
        model: 'gpt-3.5-turbo' // o 'gpt-4'
    }
};
```

## Uso

### Automático (Recomendado)

El sistema se configura automáticamente en `TransactionImportService`. Solo necesitas configurar `js/config.js`.

### Manual

```javascript
import { EmailAnalyzerFactory } from './analyzers/EmailAnalyzerFactory.js';

// Crear analizador solo regex
const regexAnalyzer = EmailAnalyzerFactory.createRegexOnly();

// Crear analizador con OpenAI
const openaiAnalyzer = EmailAnalyzerFactory.createOpenAIOnly('tu-api-key');

// Crear compuesto
const compositeAnalyzer = EmailAnalyzerFactory.create({
    useOpenAI: true,
    openaiApiKey: 'tu-api-key',
    useRegex: true
});

// Usar
const transaction = await analyzer.analyzeEmail(emailContent);
```

## Flujo de Análisis

1. **Composite Analyzer** (si está configurado):
   - Intenta RegexEmailAnalyzer primero (rápido, gratuito)
   - Si falla, intenta OpenAIEmailAnalyzer (lento, costo)

2. **Single Analyzer** (si solo uno está configurado):
   - Usa el analizador configurado directamente

## Resultado del Análisis

Cada analizador retorna un objeto con esta estructura:

```javascript
{
    amount: number,           // Positivo = ingreso, negativo = gasto
    description: string,      // Descripción clara
    date: string,            // ISO date string
    source: string,          // 'Mercado Pago', 'BBVA', etc.
    transaction_type: string, // 'compra', 'ingreso', 'retiro', etc.
    email_id: string,        // ID del email
    email_subject: string,   // Asunto del email
    needs_categorization: boolean,
    bank: string,
    confidence: number,      // 0-1 (confianza en el análisis)
    analyzed_by_ai: boolean, // true si usó IA
    analyzer_used: string    // Nombre del analizador que funcionó
}
```

## Costos

- **Regex**: $0 (gratis)
- **OpenAI GPT-3.5-turbo**: ~$0.002 por email analizado
- **OpenAI GPT-4**: ~$0.03 por email analizado

## Extender el Sistema

### Agregar Nuevo Analizador

1. Crear clase que extienda `IEmailAnalyzer`
2. Implementar `analyzeEmail(emailContent)`
3. Agregar al `EmailAnalyzerFactory` si es necesario

```javascript
import { IEmailAnalyzer } from './IEmailAnalyzer.js';

export class MiNuevoAnalyzer extends IEmailAnalyzer {
    async analyzeEmail(emailContent) {
        // Tu lógica aquí
        return transaction || null;
    }
}
```

### Agregar al Factory

```javascript
// En EmailAnalyzerFactory.js
static createCustom() {
    return new CompositeEmailAnalyzer([
        new RegexEmailAnalyzer(),
        new MiNuevoAnalyzer(),
        new OpenAIEmailAnalyzer('api-key')
    ]);
}
```

## Debugging

El sistema incluye logging detallado:

- `🔍`: Inicio de análisis
- `✅`: Análisis exitoso
- `❌`: Análisis fallido
- `🤖`: Operaciones de IA
- `📦`: Creación de analizadores

## Testing

### Pruebas Automáticas

Ejecuta el script de pruebas en la consola del navegador:

```javascript
// Cargar script de pruebas
import('./services/analyzers/test-analyzers.js');

// Ejecutar pruebas
testAnalyzers();        // Prueba analizadores completos
testRegexOnly();        // Prueba solo regex
```

### Pruebas Manuales

1. **Solo Regex**: Configurar `useOpenAI: false` en `js/config.js`
2. **Con IA**: Configurar `useOpenAI: true` y API key válida
3. **Revisar logs**: Los logs detallados aparecen en consola
4. **Importar emails**: Usar el botón de importación en la app

### Problemas Conocidos y Soluciones

#### ❌ Descripciones con CSS/HTML
**Síntomas**: Descripciones como `"ght text align right iortant"`
**Solución**: Mejorado el parser para filtrar contenido técnico

#### ❌ Error "Could not find column 'analyzed_by_ai'"
**Síntomas**: Error al guardar transacciones
**Solución**: Removidos campos no existentes en BD

#### ❌ Error "violates check constraint 'transactions_source_check'"
**Síntomas**: Error guardando con source personalizado
**Solución**: Campo source limitado a valores BD permitidos: "Mercado Pago", "BBVA", "NU", "Plata Card"

#### ❌ OpenAI devuelve formato markdown
**Síntomas**: Error parseando JSON con ```json
**Solución**: Limpieza automática de respuestas OpenAI

#### ✅ Sistema funcionando correctamente
- Regex analiza ~80% de emails correctamente
- OpenAI maneja casos complejos
- Fallback automático entre analizadores

## Consideraciones de Seguridad

- **API Keys**: Nunca commits las keys al repositorio
- **Variables de entorno**: Usar variables de entorno para keys en producción
- **Rate Limiting**: OpenAI tiene límites de uso
- **Validación**: Siempre validar respuestas antes de guardar