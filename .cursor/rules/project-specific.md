# Reglas Específicas del Proyecto WINM

## Arquitectura del Proyecto

### Stack Tecnológico
- **Backend**: Supabase (PostgreSQL + Auth + API REST + Edge Functions)
- **Automatización**: Python 3.9+ con scripts específicos
- **Frontend**: HTML5, CSS3, JavaScript Vanilla (ES6+)
- **Gráficos**: Chart.js vía CDN
- **Email**: Resend API (Edge Functions)

### Estructura del Proyecto
```
WINM/
├── supabase/
│   ├── migrations/          # Migraciones SQL (001-008)
│   └── functions/           # Edge Functions (TypeScript/Deno)
├── scripts/                 # Scripts Python de automatización
│   ├── email_parser/        # Parsers específicos por banco
│   └── utils/               # Utilidades compartidas
├── web-app/                # Frontend estático
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
└── docs/                   # Documentación consolidada
```

## Convenciones de Código

### Migraciones SQL
- Prefijos numéricos: `001_`, `002_`, `003_`, etc.
- Nombres descriptivos: `001_initial_schema.sql`
- Idempotentes: usar `IF NOT EXISTS` siempre
- Comentarios en español: `-- WINM - What I Need Most`

### Python
- **Naming**: snake_case para funciones y variables
- **Docstrings**: En todas las funciones públicas
- **Imports**: Organizados (stdlib, third-party, local)
- **Encoding**: Manejar UTF-8 explícitamente en Windows

### JavaScript
- **Naming**: camelCase para variables y funciones
- **Estilo**: ES6+ moderno
- **Async**: Usar async/await, no promesas
- **Seguridad**: escapeHtml para prevenir XSS

### SQL
- **Naming**: snake_case para tablas y columnas
- **Comentarios**: En español cuando sea necesario
- **RLS**: Siempre habilitado en todas las tablas

## Reglas de Seguridad

### Credenciales
- Service Role Key: Solo en `.env` (scripts Python)
- Anon Key: En `web-app/js/config.js` (frontend)
- **NUNCA** hardcodear credenciales en código SQL
- **NUNCA** commitear archivos `.env` o `token.json`

### Edge Functions
- Usar Webhook Secret para autenticación
- Validar todas las entradas
- Usar variables de entorno para secrets

### Base de Datos
- RLS habilitado en todas las tablas
- Políticas verifican `auth.uid() = user_id`
- Validar datos antes de insertar

## Comandos Útiles del Proyecto

### Migraciones
```powershell
# Ver migraciones aplicadas
supabase migration list

# Ejecutar migraciones
supabase db push

# Ver estado del proyecto
supabase status
```

### Scripts Python
```powershell
# Validar ambiente
python scripts\validate_environment.py

# Verificar base de datos
python scripts\verify_database_complete.py

# Pruebas de integración
python scripts\test_frontend_integration.py

# Ejecutar captura de transacciones
python scripts\main.py
```

### Edge Functions
```powershell
# Desplegar Edge Function
supabase functions deploy send-budget-alert-email

# Ver logs
supabase functions logs send-budget-alert-email
```

## Principios del Proyecto

### KISS (Keep It Simple, Stupid)
- Máxima simplicidad
- Cero complejidad innecesaria
- Sin frameworks pesados
- Configuración mínima

### SOLID (Aplicado Pragmáticamente)
- Código extensible y mantenible
- Principios aplicados cuando tienen sentido
- No sobre-ingeniería

### Cloud-First
- Todo en la nube desde el día 1
- Sin servidores que gestionar
- Supabase como backend completo

### Privacidad Total
- Datos en servicios del usuario
- Su cuenta de Supabase
- Su Gmail

## Estructura de Datos

### Tablas Principales
- `transactions` - Transacciones financieras
- `categories` - Categorías (sistema + personalizadas)
- `budgets` - Presupuestos por categoría
- `categorization_rules` - Reglas de auto-categorización
- `budget_alerts` - Alertas de presupuesto

### Funciones PL/pgSQL
- `get_budget_spent()` - Calcula gasto en presupuesto
- `auto_categorize_transaction()` - Auto-categoriza transacciones
- `check_budget_alerts()` - Verifica y crea alertas
- `get_category_expenses()` - Estadísticas por categoría

### Triggers
- `trigger_before_insert_transaction` - Auto-categorización
- `trigger_after_insert_transaction` - Verificación de presupuestos
- `trigger_after_insert_budget_alert` - Envío de email

## Bancos Soportados
- BBVA
- Mercado Pago
- NU
- Plata Card

## Categorías del Sistema
15 categorías predefinidas (no editables):
- Alimentos y Bebidas
- Transporte
- Compras
- Entretenimiento
- Servicios
- Salud
- Educación
- Ropa
- Restaurantes
- Gasolina
- Supermercado
- Servicios Públicos
- Internet/Teléfono
- Seguros
- Otros

## Flujos Principales

### Captura de Transacciones
1. Scripts Python leen emails de Gmail API
2. Parsers específicos extraen datos
3. Se insertan en Supabase con auto-categorización
4. Triggers verifican presupuestos y crean alertas

### Auto-categorización
1. Trigger antes de insertar transacción
2. Función `auto_categorize_transaction()` aplica reglas
3. Se asigna categoría si hay coincidencia
4. Se actualiza contador de regla

### Alertas de Presupuesto
1. Trigger después de insertar transacción
2. Función `check_budget_alerts()` verifica presupuestos
3. Si alcanza threshold, crea alerta
4. Trigger de alerta llama a Edge Function
5. Edge Function envía email usando Resend
