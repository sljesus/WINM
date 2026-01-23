# Análisis SOLID: Obtención de datos en WINM

Referencias: [SOLID en JavaScript (LogRocket)](https://blog.logrocket.com/solid-principles-javascript), [SRP capa datos vs servicios](https://blog.logrocket.com/single-responsibility-principle-srp), [DIP y Repository](https://martinfowler.com/articles/dipInTheWild.html).

---

## Qué dicen las buenas prácticas

1. **SRP (Single Responsibility)**  
   - **Capa de datos**: solo recuperar y persistir. Sin lógica de negocio.  
   - **Capa de servicios**: lógica de negocio. Sin acceso directo a BD/APIs; usa abstracciones.

2. **DIP (Dependency Inversion)**  
   - Los módulos de alto nivel (orquestación, negocio) no deben depender de módulos de bajo nivel (Supabase, Gmail). Ambos deben depender de **abstracciones** (ej. interfaces, repositorios).  
   - El **Repository** es la abstracción típica sobre el almacenamiento: oculta Supabase/API y expone `create`, `findByEmailId`, etc.

3. **OCP (Open-Closed)**  
   - Abrir por extensión (nuevos analizadores, nuevas fuentes), cerrar a modificación del código existente.

---

## Estado actual vs SOLID

### ✅ Lo que ya cumple

| Componente | Principio | Comentario |
|------------|-----------|------------|
| **gmailAPIService** | SRP | Solo habla con Gmail API (search, getContent). Una responsabilidad clara. |
| **IEmailAnalyzer + Composite + Factory** | OCP, LSP, ISP | Nuevos analizadores se añaden sin tocar código existente. Interfaz mínima (`analyzeEmail`). |
| **Parsers (BaseEmailParser, etc.)** | OCP | Extensibles por herencia. |
| **transactionService** (parte) | SRP | Funciones como `calculateStats`, `getTransactionsByMonth`, `searchTransactions` son lógica de negocio pura sobre datos en memoria. Está bien. |

### ❌ Violaciones y riesgos

#### 1. **transactionService mezcla datos y negocio (SRP)**

- **Hecho**: Hace acceso a Supabase (`loadTransactions`, `createTransaction`, `getCategories`, `getSources`, `updateCategory`, etc.) y además lógica de negocio (`calculateStats`, filtros, etc.).
- **Buenas prácticas**: La capa de datos solo persiste/recupera. La lógica de negocio no debería construir queries ni llamar a Supabase directamente.
- **Impacto**: Cambiar de Supabase a otra BD o API implica tocar “todo” el servicio. Tests de negocio acoplados a Supabase.

**Recomendación**:  
- Extraer un **TransactionRepository** (y opcionalmente **CategoryRepository**) que solo haga: `create`, `findAll(filters)`, `findByEmailId`, `updateCategory`, etc.  
- Dejar en **transactionService** solo lógica de negocio que trabaje con datos ya cargados (stats, filtrado, etc.) y que use el repositorio inyectado o importado.

#### 2. **TransactionImportService hace acceso a datos directo (SRP + DIP)**

- **Hecho**:  
  - Orquesta Gmail → analizador → guardar.  
  - Pero además: `_checkExistingTransaction` usa `getSupabaseClient` y queries a `transactions`.  
  - `_saveTransactions` llama a `createTransaction` (que a su vez usa Supabase).
- **Buenas prácticas**: Un orquestador no debería conocer Supabase. Debería depender de abstracciones (ej. `ITransactionRepository` con `existsByEmailId`, `create`).
- **Impacto**: Si cambia la forma de persistir (otra tabla, otro backend), hay que tocar el importador.

**Recomendación**:  
- Que `TransactionImportService` reciba un “repositorio de transacciones” (o al menos funciones) para “existe por email_id” y “crear”.  
- Que la implementación concreta (Supabase) viva en un módulo de datos/repositorio, no en el orquestador.

#### 3. **OpenAIEmailAnalyzer obtiene categorías (SRP)**

- **Hecho**: El analizador llama a `getCategories()` (vía `transactionService`) y carga categorías desde Supabase.
- **Buenas prácticas**: Un analizador debería tener una sola razón para cambiar: “cómo analizo el email”. Obtener categorías es otra responsabilidad (fuente de datos).
- **Impacto**: El analizador queda acoplado a Supabase y a `transactionService`. Difícil de testear o reutilizar sin BD.

**Recomendación**:  
- Que las categorías se obtengan fuera del analizador (por ejemplo en `TransactionImportService` o en un módulo de configuración) y se le pasen por constructor o como parámetro en `analyzeEmail`.  
- El analizador solo recibe y usa la lista; no decide de dónde sale.

#### 4. **Dependencias concretas en vez de abstracciones (DIP)**

- **Hecho**:  
  - `TransactionImportService` importa y usa directamente: `gmailAPIService`, `EmailAnalyzerFactory`, `createTransaction`, y Supabase vía `_checkExistingTransaction`.  
  - `transactionService` y otros servicios usan `getSupabaseClient` directamente.
- **Buenas prácticas**: Los módulos de alto nivel deberían depender de interfaces/repositorios, no de Supabase ni de funciones concretas de persistencia.
- **Impacto**: Sustituir Supabase por otro backend implica buscar y cambiar muchas importaciones y llamadas.

**Recomendación**:  
- Introducir abstracciones (ej. `ITransactionRepository`, `IEmailSource`) e inyectar implementaciones (Supabase, Gmail, etc.) en los servicios/orquestadores.  
- Aunque sea en forma de “facade” o “módulo” con funciones bien definidas, sin pasar por Supabase directamente en el orquestador.

---

## Resumen

| Principio | Cumplimiento | Acción prioritaria |
|-----------|--------------|--------------------|
| **SRP** | Parcial | Separar datos (Repository) vs negocio (transactionService). Que el analizador no obtenga categorías. |
| **OCP** | Bueno | Mantener; ya se cumple en analizadores y parsers. |
| **LSP** | Bueno | Mantener; analizadores sustituibles. |
| **ISP** | Bueno | Interfaz de analizador ya acotada. |
| **DIP** | Débil | Introducir repositorios/abstracciones para persistencia y fuentes de datos; inyectarlos en servicios. |

---

## Próximos pasos sugeridos (orden práctico)

1. **Extraer `TransactionRepository`**  
   - Mover `createTransaction`, `loadTransactions`, `getCategories`, `getSources`, verificación por `email_id`, etc. a un módulo repositorio que **solo** hable con Supabase.  
   - `transactionService` usa el repositorio para obtener datos y aplica lógica de negocio (stats, filtros).

2. **Desacoplar categorías del analizador**  
   - Quien orquesta el import (p. ej. `TransactionImportService`) obtiene categorías (vía repositorio o `getCategories`) y las pasa al analizador.  
   - `OpenAIEmailAnalyzer` deja de llamar a `getCategories`.

3. **Refactorizar `TransactionImportService`**  
   - Dejar de usar `getSupabaseClient` y queries directas.  
   - Usar solo el repositorio (o sus funciones) para “existe por email_id” y “crear transacción”.  
   - Si se quiere ir más allá, recibir el repositorio por constructor (dependency injection).

4. **Opcional: abstracciones formales (DIP)**  
   - Definir `ITransactionRepository`, `IEmailSource`, etc. (aunque sea como contratos en JSDoc o módulos con interface clara).  
   - Implementaciones concretas (Supabase, Gmail) en módulos separados.  
   - Los servicios/orquestadores dependen solo de esas abstracciones.

Con esto, la **obtención de datos** quedaría alineada con SOLID: datos en repositorios, negocio en servicios, analizadores sin acceso a BD, y dependencias invertidas hacia abstracciones.

---

## Cambios aplicados (refactor SOLID + DRY)

- **`ensureUser()`** en `supabaseService`: único punto "user requerido" (DRY).
- **`transactionRepository`**: capa de datos para transacciones (`findAll`, `create`, `updateCategory`, `findByEmailId`, `existsByEmailId`, `getSources`, `remove`, `removeInvalid`). Solo Supabase.
- **`transactionService`**: solo lógica de negocio; usa repositorio. `getCategories` delega a `categoryService.loadCategories` (una sola fuente).
- **`categoryService`**: usa `ensureUser`; sin duplicar patrón user+throw.
- **`TransactionImportService`**: sin Supabase directo. Usa `existsByEmailId` (repo) y `createTransaction` (repo vía service). Obtiene categorías y las pasa al analizador.
- **`OpenAIEmailAnalyzer`**: ya no obtiene categorías. Recibe `options.categories` desde el orquestador.
- **`IEmailAnalyzer.analyzeEmail(emailContent, options?)`**: opciones opcionales (p. ej. `categories`) para IA.
