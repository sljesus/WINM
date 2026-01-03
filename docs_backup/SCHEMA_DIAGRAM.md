# Diagrama del Esquema de Base de Datos - WINM

## 📊 Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────────────┐
│                      auth.users (Supabase)                   │
│                    (Tabla de autenticación)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ transactions │   │  categories   │   │   budgets    │
├──────────────┤   ├──────────────┤   ├──────────────┤
│ id (PK)      │   │ id (PK)       │   │ id (PK)      │
│ user_id (FK) │──▶│ user_id (FK)  │   │ user_id (FK) │
│ amount       │   │ name          │   │ category_id  │──┐
│ description  │   │ icon          │   │ amount       │  │
│ date         │   │ color         │   │ period_type  │  │
│ category     │   │ is_system     │   │ period_start │  │
│ category_id──┼──▶│ created_at    │   │ period_end   │  │
│ bank         │   └──────────────┘   │ alert_thresh │  │
│ source       │                       │ is_active    │  │
│ type         │                       └──────────────┘  │
│ email_id     │                                         │
│ email_subject│   ┌──────────────────────┐              │
│ needs_cat    │   │ categorization_rules │              │
│ expense_det  │   ├──────────────────────┤              │
│ created_at   │   │ id (PK)              │              │
│ processed_at │   │ user_id (FK)          │              │
└──────────────┘   │ category_id (FK)──────┼──────────────┘
                   │ rule_type             │
                   │ pattern               │
                   │ priority              │
                   │ is_active             │
                   └──────────────────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│budget_alerts │   │   (triggers)  │   │   (views)    │
├──────────────┤   │               │   │              │
│ id (PK)      │   │ auto_categorize│   │budget_summary│
│ user_id (FK) │   │ check_alerts  │   │              │
│ budget_id────┼───┘               │   │              │
│ current_spent│                   │   │              │
│ budget_amount│                   │   │              │
│ percentage   │                   │   │              │
│ alert_type   │                   │   │              │
│ is_read      │                   │   │              │
└──────────────┘                   └──────────────┘
```

## 📋 Resumen de Tablas

### Tablas Principales

| Tabla | Propósito | Registros Estimados |
|-------|-----------|-------------------|
| `transactions` | Transacciones financieras | ~10,000-100,000/año |
| `categories` | Categorías de gastos | ~15-50 (sistema + personalizadas) |
| `budgets` | Presupuestos por categoría | ~10-30 activos |
| `categorization_rules` | Reglas de auto-categorización | ~20-100 |
| `budget_alerts` | Alertas de presupuesto | ~50-200/mes |

### Relaciones Clave

1. **transactions → categories**
   - `category_id` FK a `categories.id`
   - `ON DELETE SET NULL` (si se elimina categoría, transacción mantiene category text)

2. **transactions → users**
   - `user_id` FK a `auth.users.id`
   - `ON DELETE CASCADE` (si se elimina usuario, se eliminan transacciones)

3. **budgets → categories**
   - `category_id` FK a `categories.id`
   - `ON DELETE CASCADE` (si se elimina categoría, se eliminan presupuestos)

4. **budgets → users**
   - `user_id` FK a `auth.users.id`
   - `ON DELETE CASCADE`

5. **categorization_rules → categories**
   - `category_id` FK a `categories.id`
   - `ON DELETE CASCADE`

6. **budget_alerts → budgets**
   - `budget_id` FK a `budgets.id`
   - `ON DELETE CASCADE`

## 🔄 Flujo de Datos

```
1. EMAIL LLEGA (Gmail API)
   │
   ▼
2. PARSER EXTRAE DATOS
   │
   ▼
3. INSERT INTO transactions
   │
   ├─▶ TRIGGER: trigger_before_insert_transaction
   │   └─▶ auto_categorize_transaction()
   │       └─▶ Busca en categorization_rules
   │           └─▶ Asigna category_id si encuentra match
   │
   ▼
4. TRANSACTION INSERTED
   │
   ├─▶ TRIGGER: trigger_after_insert_transaction
   │   └─▶ check_budget_alerts()
   │       └─▶ Calcula get_budget_spent()
   │       └─▶ Crea budget_alerts si necesario
   │
   ▼
5. FRONTEND CONSULTA
   │
   ├─▶ get_category_expenses() → Dashboard
   ├─▶ budget_summary → Presupuestos
   └─▶ SELECT * FROM transactions → Lista
```

## 🔐 Seguridad (RLS)

Todas las tablas tienen **Row Level Security (RLS)** habilitado:

- ✅ Usuarios solo ven sus propios datos
- ✅ Usuarios solo pueden insertar sus propios datos
- ✅ Usuarios solo pueden actualizar sus propios datos
- ✅ Usuarios solo pueden eliminar sus propios datos
- ✅ Categorías del sistema son visibles para todos

## 📈 Índices Principales

### Para Performance:
- `idx_transactions_user_id` - Consultas por usuario
- `idx_transactions_date` - Ordenamiento por fecha
- `idx_transactions_category_id` - Filtros por categoría
- `idx_transactions_budget_lookup` - Cálculo de presupuestos (compuesto)
- `idx_transactions_email_unique` - Evitar duplicados (único)

### Para Consultas Frecuentes:
- `idx_budgets_active` - Solo presupuestos activos
- `idx_alerts_unread` - Solo alertas no leídas
- `idx_rules_active` - Solo reglas activas

## ✅ Estado de Migraciones

| Migración | Estado | Descripción |
|-----------|--------|-------------|
| 001 | ✅ Lista | Esquema inicial de transactions |
| 002 | ✅ Lista | Mejoras para múltiples fuentes |
| 003 | ✅ Lista | Presupuestos, categorías y reglas |
| 004 | ✅ Lista | Funciones y triggers automáticos |
| 005 | ✅ Lista | Correcciones y validaciones |

## 🎯 Próximos Pasos

1. ✅ Ejecutar migraciones 001-005 en Supabase
2. ⏳ Crear parsers de email para cada fuente
3. ⏳ Implementar frontend con dashboard
4. ⏳ Implementar sistema de presupuestos en frontend
5. ⏳ Implementar auto-categorización en parsers
