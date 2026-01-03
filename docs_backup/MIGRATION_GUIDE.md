# Guía Completa de Migraciones - WINM

Guía completa para ejecutar las migraciones SQL del proyecto WINM. Incluye todas las opciones disponibles y solución de problemas.

---

## Inicio Rápido

### Opción Más Simple (Recomendada)

Ejecuta el script automático que te guiará paso a paso:

```bash
python scripts/run_migrations_cli.py
```

El script verifica la CLI, vincula el proyecto si es necesario, y ejecuta las migraciones automáticamente.

---

## Opciones Disponibles

Tienes **3 formas** de ejecutar las migraciones SQL:

### 1. Supabase CLI (Recomendado - Automatizado)

**Comando:**
```bash
supabase db push
```

**Requisitos:**
- Supabase CLI instalada: `supabase --version`
- Proyecto vinculado: `supabase link --project-ref ioixblxanqcacqzlijps`
- Access Token o login: `supabase login`

**Ventajas:**
- ✅ Automatizado
- ✅ Versionado de migraciones
- ✅ Fácil rollback
- ✅ Ideal para CI/CD

**Pasos Detallados:**

#### Paso 1: Obtener Access Token

1. Ve a [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Haz clic en **Generate new token**
3. Copia el token (solo se muestra una vez)

#### Paso 2: Vincular Proyecto

**Opción A: Con Access Token**
```bash
supabase link --project-ref ioixblxanqcacqzlijps
```

Te pedirá:
- **Access token**: Pega el token que copiaste
- **Database password**: La contraseña de tu base de datos (Settings → Database)

**Opción B: Con Login Interactivo**
```bash
# Login primero
supabase login

# Luego vincular
supabase link --project-ref ioixblxanqcacqzlijps
```

#### Paso 3: Ejecutar Migraciones

```bash
supabase db push
```

Esto ejecutará todas las migraciones en orden desde `supabase/migrations/`.

**Comandos Útiles:**
```bash
# Ver migraciones aplicadas
supabase migration list

# Ver estado del proyecto
supabase status

# Ver diferencias entre local y remoto
supabase db diff
```

---

### 2. Script Python con CLI

**Comando:**
```bash
python scripts/run_migrations_cli.py
```

**Qué hace:**
- Verifica que Supabase CLI esté instalada
- Verifica que el proyecto esté vinculado
- Si no está vinculado, te guía para vincularlo
- Ejecuta `supabase db push` automáticamente
- Muestra resumen de resultados

**Ventajas:**
- ✅ Interfaz amigable
- ✅ Validaciones automáticas
- ✅ Guía paso a paso

---

### 3. SQL Editor Manual (Sin CLI)

**Cuándo usar:** Si prefieres no usar la CLI o tienes problemas con autenticación.

**Pasos:**

#### Paso 1: Abrir SQL Editor

Ve a: [https://supabase.com/dashboard/project/ioixblxanqcacqzlijps/sql/new](https://supabase.com/dashboard/project/ioixblxanqcacqzlijps/sql/new)

#### Paso 2: Ejecutar Migraciones en Orden

**IMPORTANTE:** Ejecuta las migraciones **una por una** en este orden exacto:

**Migración 001: Esquema Inicial**
1. Abre el archivo: `supabase/migrations/001_initial_schema.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor
4. Haz clic en **Run** (o presiona F5)
5. Verifica que diga "Success"

**Migración 002: Mejoras de Fuentes**
1. Abre: `supabase/migrations/002_improve_schema_for_sources.sql`
2. Copia, pega y ejecuta

**Migración 003: Presupuestos y Categorías**
1. Abre: `supabase/migrations/003_add_budgets_categories_rules.sql`
2. Copia, pega y ejecuta
3. **Verifica**: Debe insertar 15 categorías del sistema

**Migración 004: Funciones Automáticas**
1. Abre: `supabase/migrations/004_add_auto_categorization_functions.sql`
2. Copia, pega y ejecuta

**Migración 005: Correcciones**
1. Abre: `supabase/migrations/005_fix_constraints_and_validations.sql`
2. Copia, pega y ejecuta

**Migración 006: Edge Function Trigger**
1. Abre: `supabase/migrations/006_add_edge_function_trigger.sql`
2. Copia, pega y ejecuta

**Migración 007: Corrección de Seguridad**
1. Abre: `supabase/migrations/007_fix_security_service_key.sql`
2. Copia, pega y ejecuta

**Migración 008: Corrección de Tipo**
1. Abre: `supabase/migrations/008_fix_get_category_expenses_type.sql`
2. Copia, pega y ejecuta

**Ventajas:**
- ✅ No requiere configuración adicional
- ✅ Control total sobre cada migración
- ✅ Puedes ver errores en tiempo real

---

## Verificar Migraciones Aplicadas

### Con CLI

```bash
# Ver migraciones aplicadas
supabase migration list

# Ver estado del proyecto
supabase status
```

### Manualmente (SQL Editor)

Ejecuta estas consultas en SQL Editor:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts');

-- Verificar categorías del sistema (debe retornar 15)
SELECT COUNT(*) FROM categories WHERE is_system = TRUE;

-- Verificar funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_budget_spent', 'auto_categorize_transaction', 'check_budget_alerts', 'get_category_expenses');
```

### Con Script Python

```bash
python scripts/validate_environment.py
```

---

## Obtener SUPABASE_USER_ID

Para pruebas y scripts Python, necesitas el `user_id` del usuario en Supabase Auth.

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication** → **Users**
3. Si ya tienes un usuario, copia su **UUID** (ID)
4. Si no tienes usuarios, crea uno:
   - Click en **Add User** → **Create new user**
   - Ingresa email y contraseña
   - Copia el **UUID** generado
5. Agrega al archivo `.env`:
   ```env
   SUPABASE_USER_ID=tu-uuid-aqui
   ```

### Opción 2: Automático (Scripts Mejorados)

Los scripts mejorados (`test_frontend_integration.py`, `main.py`) intentan obtener el `user_id` automáticamente:

1. Primero buscan en `.env` (`SUPABASE_USER_ID`)
2. Si no está, intentan obtener el primer usuario de Supabase Auth
3. Si falla, muestran un mensaje con instrucciones

**Nota:** Requiere que tengas al menos un usuario creado en Supabase Auth.

### Opción 3: Desde SQL Editor

Ejecuta esta consulta en Supabase SQL Editor:

```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;
```

Copia el `id` (UUID) y agrégalo a `.env`.

### Verificar que Funciona

Ejecuta el script de pruebas:

```bash
python scripts/test_frontend_integration.py
```

Si el `user_id` está correcto, las pruebas que requieren usuario deberían pasar.

---

## Solución de Problemas

### Error: "project not linked"

```bash
# Vincular proyecto primero
supabase link --project-ref ioixblxanqcacqzlijps
```

### Error: "access token required" o "invalid access token"

**Opción 1: Login interactivo**
```bash
supabase login
```

**Opción 2: Usar token directamente**
```bash
supabase link --project-ref ioixblxanqcacqzlijps --token TU_ACCESS_TOKEN
```

**Opción 3: Generar nuevo token**
1. Ve a [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Genera un nuevo token
3. Vuelve a vincular el proyecto

### Error: "insufficient privileges" o "Your account does not have the necessary privileges"

- Verifica que estés logueado con la cuenta correcta (`supabase login`)
- Asegúrate de tener permisos de administrador en el proyecto
- Genera un nuevo Access Token con permisos completos

### Error: "database password required"

- Ve a Settings → Database en tu proyecto Supabase
- Resetea la contraseña si es necesario
- Úsala al vincular el proyecto

### Error: "relation already exists" o "constraint already exists"

- Las migraciones usan `IF NOT EXISTS`, esto no debería pasar
- Las migraciones son idempotentes (puedes ejecutarlas múltiples veces)
- Si ocurre, verifica el estado con `supabase migration list`

### Error: "migration already applied"

- Las migraciones son idempotentes
- Puedes ejecutarlas múltiples veces sin problemas
- Si hay conflicto, verifica el estado con `supabase migration list`

### Error al insertar categorías

- Verifica que la constraint `unique_category_name_per_user` existe
- Si no existe, ejecuta primero la parte de creación de constraint en migración 003

### Prefieres no usar CLI

- Usa el SQL Editor manual (Opción 3)
- Es igual de válido y funcional

---

## Checklist Pre-Migración

Antes de ejecutar migraciones, verifica:

- [ ] Supabase CLI instalada: `supabase --version` ✅
- [ ] Variables de entorno configuradas en `.env`:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Proyecto Supabase creado y activo
- [ ] Access Token obtenido (si usas CLI)
- [ ] Database password disponible (si usas CLI)

---

## Próximos Pasos

Después de ejecutar las migraciones:

1. ✅ Verifica que todas las tablas existen
2. ✅ Verifica que hay 15 categorías del sistema
3. ✅ Ejecuta `python scripts/test_frontend_integration.py` para validar
4. ✅ Continúa con la implementación de scripts Python o desarrollo frontend

---

## Notas Importantes

- Las migraciones se ejecutan en orden alfabético (por eso usamos prefijos numéricos: 001_, 002_, etc.)
- Las migraciones son transaccionales (si una falla, se revierte todo)
- Las migraciones usan `IF NOT EXISTS` para hacerlas idempotentes
- Siempre prueba las migraciones en un ambiente de desarrollo primero
- El proyecto ref es: `ioixblxanqcacqzlijps`
