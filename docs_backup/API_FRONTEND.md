# API Frontend - WINM

Documentación completa de la API de Supabase para el desarrollo del frontend. Incluye estructura de datos, queries comunes, funciones RPC y ejemplos de código JavaScript.

---

## Configuración Inicial

### Inicializar Cliente Supabase

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ioixblxanqcacqzlijps.supabase.co'
const supabaseAnonKey = 'tu-anon-key-aqui'

const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Estructura de Datos

### 1. Tabla: `transactions`

**Campos:**

```typescript
{
  id: string (UUID)
  amount: number (DECIMAL) // Positivo = ingreso, Negativo = gasto
  description: string (TEXT)
  date: string (TIMESTAMP WITH TIME ZONE) // ISO 8601
  category_id: string | null (UUID, FK a categories)
  category: string | null (TEXT) // Nombre de categoría (compatibilidad)
  source: string // 'BBVA' | 'Mercado Pago' | 'NU' | 'Plata Card'
  transaction_type: string // 'compra' | 'ingreso' | 'retiro' | 'transferencia' | 'otro'
  email_id: string | null (VARCHAR)
  email_subject: string | null (TEXT)
  needs_categorization: boolean // TRUE para retiros que requieren detalle
  expense_detail: string | null (TEXT) // Detalle de gasto (retiros)
  user_id: string (UUID, FK a auth.users)
  created_at: string (TIMESTAMP WITH TIME ZONE)
  processed_at: string (TIMESTAMP WITH TIME ZONE)
}
```

**Ejemplo de Objeto:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": -150.50,
  "description": "Compra en Supermercado",
  "date": "2025-12-31T10:00:00Z",
  "category_id": "456e7890-e89b-12d3-a456-426614174001",
  "category": "Supermercado",
  "source": "BBVA",
  "transaction_type": "compra",
  "email_id": "gmail-message-id-123",
  "email_subject": "Notificación de compra",
  "needs_categorization": false,
  "expense_detail": null,
  "user_id": "789e0123-e89b-12d3-a456-426614174002",
  "created_at": "2025-12-31T10:05:00Z",
  "processed_at": "2025-12-31T10:05:00Z"
}
```

---

### 2. Tabla: `categories`

**Campos:**

```typescript
{
  id: string (UUID)
  name: string (VARCHAR) // Nombre de la categoría
  icon: string | null (VARCHAR) // Nombre del icono
  color: string | null (VARCHAR) // Color hex (#RRGGBB)
  is_system: boolean // TRUE para categorías del sistema
  user_id: string | null (UUID, FK) // NULL para sistema, UUID para personalizadas
  created_at: string (TIMESTAMP WITH TIME ZONE)
}
```

**Ejemplo de Objeto:**

```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Supermercado",
  "icon": "cart",
  "color": "#5DADE2",
  "is_system": true,
  "user_id": null,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### 3. Tabla: `budgets`

**Campos:**

```typescript
{
  id: string (UUID)
  user_id: string (UUID, FK a auth.users)
  category_id: string (UUID, FK a categories)
  amount: number (DECIMAL) // Monto del presupuesto
  period_type: string // 'mensual' | 'semanal' | 'anual'
  period_start: string (DATE) // YYYY-MM-DD
  period_end: string (DATE) // YYYY-MM-DD
  alert_threshold: number (DECIMAL) // Porcentaje 0-100
  is_active: boolean
  created_at: string (TIMESTAMP WITH TIME ZONE)
  updated_at: string (TIMESTAMP WITH TIME ZONE)
}
```

**Ejemplo de Objeto:**

```json
{
  "id": "789e0123-e89b-12d3-a456-426614174003",
  "user_id": "789e0123-e89b-12d3-a456-426614174002",
  "category_id": "456e7890-e89b-12d3-a456-426614174001",
  "amount": 2000.00,
  "period_type": "mensual",
  "period_start": "2025-12-01",
  "period_end": "2025-12-31",
  "alert_threshold": 80.00,
  "is_active": true,
  "created_at": "2025-12-01T00:00:00Z",
  "updated_at": "2025-12-01T00:00:00Z"
}
```

---

### 4. Tabla: `categorization_rules`

**Campos:**

```typescript
{
  id: string (UUID)
  user_id: string (UUID, FK a auth.users)
  category_id: string (UUID, FK a categories)
  rule_type: string // 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'exact_match'
  pattern: string (TEXT) // Patrón a buscar
  is_case_sensitive: boolean
  priority: number (INTEGER) // Menor número = mayor prioridad
  is_active: boolean
  match_count: number (INTEGER) // Estadísticas de uso
  created_at: string (TIMESTAMP WITH TIME ZONE)
  updated_at: string (TIMESTAMP WITH TIME ZONE)
}
```

**Ejemplo de Objeto:**

```json
{
  "id": "012e3456-e89b-12d3-a456-426614174004",
  "user_id": "789e0123-e89b-12d3-a456-426614174002",
  "category_id": "456e7890-e89b-12d3-a456-426614174001",
  "rule_type": "contains",
  "pattern": "SUPERMERCADO",
  "is_case_sensitive": false,
  "priority": 1,
  "is_active": true,
  "match_count": 45,
  "created_at": "2025-12-01T00:00:00Z",
  "updated_at": "2025-12-01T00:00:00Z"
}
```

---

### 5. Tabla: `budget_alerts`

**Campos:**

```typescript
{
  id: string (UUID)
  user_id: string (UUID, FK a auth.users)
  budget_id: string (UUID, FK a budgets)
  current_spent: number (DECIMAL)
  budget_amount: number (DECIMAL)
  percentage_used: number (DECIMAL) // 0-100
  alert_type: string // 'threshold' | 'exceeded' | 'warning'
  is_read: boolean
  created_at: string (TIMESTAMP WITH TIME ZONE)
}
```

**Ejemplo de Objeto:**

```json
{
  "id": "345e6789-e89b-12d3-a456-426614174005",
  "user_id": "789e0123-e89b-12d3-a456-426614174002",
  "budget_id": "789e0123-e89b-12d3-a456-426614174003",
  "current_spent": 1600.00,
  "budget_amount": 2000.00,
  "percentage_used": 80.00,
  "alert_type": "threshold",
  "is_read": false,
  "created_at": "2025-12-31T10:00:00Z"
}
```

---

## Queries Comunes

### SELECT - Consultar Transacciones

**Obtener todas las transacciones del usuario:**

```javascript
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .order('date', { ascending: false })
  .limit(50)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Transacciones:', data)
}
```

**Obtener transacciones con filtros:**

```javascript
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('source', 'BBVA')
  .eq('transaction_type', 'compra')
  .gte('date', '2025-12-01')
  .lte('date', '2025-12-31')
  .order('date', { ascending: false })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Transacciones filtradas:', data)
}
```

**Obtener transacciones que necesitan categorización:**

```javascript
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('needs_categorization', true)
  .order('date', { ascending: false })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Transacciones pendientes:', data)
}
```

**Obtener transacciones con categorías (JOIN):**

```javascript
const { data, error } = await supabase
  .from('transactions')
  .select(`
    *,
    categories (
      id,
      name,
      icon,
      color
    )
  `)
  .order('date', { ascending: false })
  .limit(50)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Transacciones con categorías:', data)
}
```

---

### SELECT - Consultar Categorías

**Obtener todas las categorías (sistema + personalizadas):**

```javascript
const { data, error } = await supabase
  .from('categories')
  .select('*')
  .order('is_system', { ascending: false })
  .order('name', { ascending: true })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Categorías:', data)
}
```

**Obtener solo categorías del sistema:**

```javascript
const { data, error } = await supabase
  .from('categories')
  .select('*')
  .eq('is_system', true)
  .order('name', { ascending: true })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Categorías del sistema:', data)
}
```

**Obtener solo categorías personalizadas:**

```javascript
const { data, error } = await supabase
  .from('categories')
  .select('*')
  .eq('is_system', false)
  .order('name', { ascending: true })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Mis categorías:', data)
}
```

---

### SELECT - Consultar Presupuestos

**Obtener presupuestos activos:**

```javascript
const { data, error } = await supabase
  .from('budgets')
  .select(`
    *,
    categories (
      id,
      name,
      icon,
      color
    )
  `)
  .eq('is_active', true)
  .order('created_at', { ascending: false })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Presupuestos activos:', data)
}
```

**Obtener presupuestos para un período específico:**

```javascript
const { data, error } = await supabase
  .from('budgets')
  .select('*')
  .eq('period_type', 'mensual')
  .gte('period_start', '2025-12-01')
  .lte('period_end', '2025-12-31')
  .eq('is_active', true)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Presupuestos del mes:', data)
}
```

---

### SELECT - Consultar Alertas

**Obtener alertas no leídas:**

```javascript
const { data, error } = await supabase
  .from('budget_alerts')
  .select(`
    *,
    budgets!inner (
      *,
      categories!inner (
        name,
        icon,
        color
      )
    )
  `)
  .eq('is_read', false)
  .order('created_at', { ascending: false })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Alertas no leídas:', data)
}
```

---

### SELECT - Consultar Reglas

**Obtener reglas activas ordenadas por prioridad:**

```javascript
const { data, error } = await supabase
  .from('categorization_rules')
  .select(`
    *,
    categories (
      id,
      name,
      icon,
      color
    )
  `)
  .eq('is_active', true)
  .order('priority', { ascending: true })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Reglas activas:', data)
}
```

---

### INSERT - Crear Transacción

```javascript
const { data, error } = await supabase
  .from('transactions')
  .insert({
    amount: -150.50,
    description: 'Compra en Supermercado',
    date: '2025-12-31T10:00:00Z',
    source: 'BBVA',
    transaction_type: 'compra',
    category_id: '456e7890-e89b-12d3-a456-426614174001',
    needs_categorization: false
  })
  .select()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Transacción creada:', data)
}
```

---

### INSERT - Crear Categoría Personalizada

```javascript
const { data, error } = await supabase
  .from('categories')
  .insert({
    name: 'Gaming',
    icon: 'gamepad',
    color: '#9B59B6',
    is_system: false
  })
  .select()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Categoría creada:', data)
}
```

---

### INSERT - Crear Presupuesto

```javascript
const { data, error } = await supabase
  .from('budgets')
  .insert({
    category_id: '456e7890-e89b-12d3-a456-426614174001',
    amount: 2000.00,
    period_type: 'mensual',
    period_start: '2025-12-01',
    period_end: '2025-12-31',
    alert_threshold: 80.00,
    is_active: true
  })
  .select()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Presupuesto creado:', data)
}
```

---

### INSERT - Crear Regla de Auto-categorización

```javascript
const { data, error } = await supabase
  .from('categorization_rules')
  .insert({
    category_id: '456e7890-e89b-12d3-a456-426614174001',
    rule_type: 'contains',
    pattern: 'SUPERMERCADO',
    is_case_sensitive: false,
    priority: 1,
    is_active: true
  })
  .select()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Regla creada:', data)
}
```

---

### UPDATE - Actualizar Transacción

**Categorizar un retiro:**

```javascript
const { data, error } = await supabase
  .from('transactions')
  .update({
    category_id: '456e7890-e89b-12d3-a456-426614174001',
    expense_detail: 'Compra de alimentos',
    needs_categorization: false
  })
  .eq('id', '123e4567-e89b-12d3-a456-426614174000')
  .select()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Transacción actualizada:', data)
}
```

---

### UPDATE - Marcar Alerta como Leída

```javascript
const { data, error } = await supabase
  .from('budget_alerts')
  .update({
    is_read: true
  })
  .eq('id', '345e6789-e89b-12d3-a456-426614174005')
  .select()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Alerta marcada como leída:', data)
}
```

---

### DELETE - Eliminar Presupuesto

```javascript
const { error } = await supabase
  .from('budgets')
  .delete()
  .eq('id', '789e0123-e89b-12d3-a456-426614174003')

if (error) {
  console.error('Error:', error)
} else {
  console.log('Presupuesto eliminado')
}
```

---

## Funciones RPC

### `get_budget_spent`

Calcula el gasto total en una categoría para un período específico.

**Parámetros:**
- `p_user_id` (UUID): ID del usuario
- `p_category_id` (UUID): ID de la categoría
- `p_period_start` (DATE): Fecha de inicio del período
- `p_period_end` (DATE): Fecha de fin del período

**Retorna:** `DECIMAL(10, 2)` - Monto total gastado

**Ejemplo:**

```javascript
const { data, error } = await supabase
  .rpc('get_budget_spent', {
    p_user_id: '789e0123-e89b-12d3-a456-426614174002',
    p_category_id: '456e7890-e89b-12d3-a456-426614174001',
    p_period_start: '2025-12-01',
    p_period_end: '2025-12-31'
  })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Gasto total:', data) // Ej: 1600.50
}
```

---

### `get_category_expenses`

Obtiene estadísticas de gastos por categoría en un período.

**Parámetros:**
- `p_user_id` (UUID): ID del usuario
- `p_start_date` (DATE): Fecha de inicio
- `p_end_date` (DATE): Fecha de fin

**Retorna:** Tabla con:
- `category_id` (UUID)
- `category_name` (TEXT)
- `total_amount` (DECIMAL)
- `transaction_count` (BIGINT)

**Ejemplo:**

```javascript
const { data, error } = await supabase
  .rpc('get_category_expenses', {
    p_user_id: '789e0123-e89b-12d3-a456-426614174002',
    p_start_date: '2025-12-01',
    p_end_date: '2025-12-31'
  })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Gastos por categoría:', data)
  // Ejemplo de respuesta:
  // [
  //   {
  //     category_id: '456e7890-e89b-12d3-a456-426614174001',
  //     category_name: 'Supermercado',
  //     total_amount: 1600.50,
  //     transaction_count: 12
  //   },
  //   ...
  // ]
}
```

---

## Vista: `budget_summary`

Vista que muestra presupuestos con gasto actual calculado.

**Campos:**
- `id` (UUID)
- `user_id` (UUID)
- `category_id` (UUID)
- `category_name` (TEXT)
- `budget_amount` (DECIMAL)
- `current_spent` (DECIMAL)
- `percentage_used` (DECIMAL)
- `period_type` (VARCHAR)
- `status` (VARCHAR) // 'active' | 'exceeded' | 'threshold'

**Ejemplo de Consulta:**

```javascript
const { data, error } = await supabase
  .from('budget_summary')
  .select('*')
  .eq('is_active', true)
  .order('percentage_used', { ascending: false })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Resumen de presupuestos:', data)
}
```

---

## Manejo de Errores

### Patrón Común

```javascript
async function loadData() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error cargando datos:', error)
    return { success: false, error: error.message }
  }
}
```

### Tipos de Errores Comunes

**Error de Autenticación:**
```javascript
if (error?.code === 'PGRST301') {
  // Usuario no autenticado
  console.error('No autenticado')
}
```

**Error de Permisos:**
```javascript
if (error?.code === '42501') {
  // Sin permisos (RLS)
  console.error('Sin permisos')
}
```

**Error de Validación:**
```javascript
if (error?.code === '23505') {
  // Violación de constraint único
  console.error('Duplicado:', error.message)
}
```

---

## Autenticación

### Iniciar Sesión

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@ejemplo.com',
  password: 'contraseña'
})

if (error) {
  console.error('Error de login:', error)
} else {
  console.log('Usuario autenticado:', data.user)
}
```

### Cerrar Sesión

```javascript
const { error } = await supabase.auth.signOut()

if (error) {
  console.error('Error de logout:', error)
} else {
  console.log('Sesión cerrada')
}
```

### Verificar Sesión

```javascript
const { data: { session } } = await supabase.auth.getSession()

if (session) {
  console.log('Usuario autenticado:', session.user)
} else {
  console.log('No hay sesión activa')
}
```

### Escuchar Cambios de Autenticación

```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('Usuario inició sesión')
  } else if (event === 'SIGNED_OUT') {
    console.log('Usuario cerró sesión')
  }
})
```

---

## Ejemplos de Uso Completo

### Cargar Dashboard

```javascript
async function loadDashboard() {
  // Obtener transacciones del mes actual
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', monthStart.toISOString())
    .lte('date', monthEnd.toISOString())
    .order('date', { ascending: false })

  if (txError) {
    console.error('Error cargando transacciones:', txError)
    return
  }

  // Obtener gastos por categoría
  const { data: expenses, error: expError } = await supabase
    .rpc('get_category_expenses', {
      p_user_id: (await supabase.auth.getSession()).data.session.user.id,
      p_start_date: monthStart.toISOString().split('T')[0],
      p_end_date: monthEnd.toISOString().split('T')[0]
    })

  if (expError) {
    console.error('Error cargando gastos:', expError)
    return
  }

  // Obtener presupuestos activos
  const { data: budgets, error: budgetError } = await supabase
    .from('budget_summary')
    .select('*')
    .eq('is_active', true)

  if (budgetError) {
    console.error('Error cargando presupuestos:', budgetError)
    return
  }

  return {
    transactions,
    expenses,
    budgets
  }
}
```

---

## Notas Importantes

1. **RLS (Row Level Security)**: Todas las consultas automáticamente filtran por `user_id` del usuario autenticado.

2. **Fechas**: Usar formato ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`) para campos TIMESTAMP.

3. **Montos**: Los montos negativos representan gastos, los positivos ingresos.

4. **Categorías del Sistema**: No se pueden editar ni eliminar (`is_system = TRUE`).

5. **Auto-categorización**: Se ejecuta automáticamente al insertar transacciones mediante triggers.

6. **Alertas de Presupuesto**: Se crean automáticamente cuando se alcanza el threshold o se excede el presupuesto.
