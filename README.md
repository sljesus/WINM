# WINM - What I Need Most

Sistema personal de control financiero profesional en la nube.

## Objetivo

"Siento que se me va el dinero y no sé en qué, quiero tener control profesional sobre todas mis finanzas personales"

## Filosofía

### KISS (Keep It Simple, Stupid)
- Máxima simplicidad, cero complejidad innecesaria
- Sin frameworks pesados
- Configuración mínima necesaria

### SOLID
- Código extensible y mantenible
- Principios aplicados pragmáticamente

### Cloud-First
- Todo en la nube desde el día 1
- Sin servidores que gestionar

### Privacidad Total
- Mis datos en mis servicios (mi cuenta de Supabase, mi Gmail)

## Arquitectura

```
winm/
├── supabase/              # Configuración Supabase
│   └── migrations/        # Migraciones SQL
├── scripts/               # Scripts Python de automatización
│   ├── email_parser/      # Parsers específicos por banco
│   └── utils/             # Utilidades compartidas
├── web-app/               # Frontend estático
│   ├── index.html         # Página principal
│   ├── css/               # Estilos
│   ├── js/                # JavaScript vanilla
│   └── assets/            # Recursos estáticos
└── docs/                  # Documentación
```

## Tecnologías

- **Backend**: Supabase (PostgreSQL + Auth + API REST + Edge Functions)
- **Base de Datos**: PostgreSQL 15+ con Row Level Security (RLS)
- **Automatización**: Python 3.9+ con scripts específicos
- **Frontend**: HTML5, CSS3, JavaScript Vanilla (ES6+ con módulos)
- **Gráficos**: Chart.js 4.4.0 (via CDN)
- **Email**: Resend (para alertas de presupuesto)
- **APIs**: Gmail API (para captura automática de transacciones)

## Estado del Proyecto

✅ **Backend**: 100% completo
- Base de datos con 5 tablas principales
- 8 migraciones ejecutadas (001-008)
- Funciones PL/pgSQL y triggers activos
- Edge Functions desplegadas
- Row Level Security configurado

✅ **Frontend**: ~85% completo
- ✅ Autenticación completa
- ✅ Dashboard con gráficos (Chart.js)
- ✅ Gestión de transacciones con filtros
- ✅ Categorización manual de retiros
- ✅ Presupuestos (completo - crear, editar, ver progreso, alertas)
- ⏳ Gestión de categorías (pendiente)
- ⏳ Reglas de auto-categorización (pendiente)

✅ **Scripts Python**: 100% completo
- Parsers para 4 bancos (BBVA, Mercado Pago, NU, Plata Card)
- Cliente Gmail API configurado
- Validación y manejo de errores

## Inicio Rápido

### 1. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Obtener credenciales (URL y anon key)
3. Copiar `.env.example` a `.env` y completar las variables:
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   SUPABASE_ANON_KEY=tu-anon-key
   ```
4. Ejecutar migraciones (ver [Guía de Migraciones](docs/MIGRATION_GUIDE.md)):
   ```bash
   # Opción 1: Con Supabase CLI (recomendado)
   supabase link --project-ref tu-project-ref
   supabase db push
   
   # Opción 2: Script Python automatizado
   python scripts/run_migrations_cli.py
   
   # Opción 3: Manualmente desde SQL Editor
   # Ejecutar migraciones 001-008 en orden
   ```

### 2. Configurar Scripts Python

```bash
# Instalar dependencias
pip install -r requirements.txt

# Validar configuración
python scripts/validate_environment.py

# Configurar credenciales de Gmail API (opcional)
# Ver: docs/GMAIL_API_SETUP.md
# Colocar credentials.json en la raíz del proyecto
```

### 3. Configurar Frontend

1. Editar `web-app/js/config.js` con tus credenciales de Supabase:
   ```javascript
   const CONFIG = {
       supabase: {
           url: 'https://tu-proyecto.supabase.co',
           anonKey: 'tu-anon-key'
       }
   };
   ```

2. Abrir `web-app/index.html` en un navegador o servir estáticamente:
   ```bash
   # Con Python
   python -m http.server 8000
   
   # Con Node.js
   npx serve web-app
   
   # Con Vercel/Netlify
   # Desplegar carpeta web-app como sitio estático
   ```

3. Crear usuario en Supabase Auth (Authentication → Users → Add User)

## Documentación

### 📋 Documentación Principal
- **[Contexto General del Proyecto](docs/CONTEXTO_GENERAL_PROYECTO.md)** ⭐ - **LEER PRIMERO** - Contexto completo para nuevos chats
- [Arquitectura del Sistema](docs/ARCHITECTURE.md)
- [Documentación de Scripts](scripts/README.md)

### 🛠️ Guías de Setup
- [Guía de Migraciones](docs/MIGRATION_GUIDE.md) - Guía completa para ejecutar migraciones
- [Setup Gmail API](docs/GMAIL_API_SETUP.md) - Configuración de Gmail API paso a paso
- [Setup Edge Functions](docs/EDGE_FUNCTIONS_SETUP.md) - Configuración de Edge Functions

### 📊 Documentación Técnica
- [Revisión de Esquema](docs/SCHEMA_REVIEW.md) - Revisión completa del esquema de base de datos
- [Diagrama de Esquema](docs/SCHEMA_DIAGRAM.md) - Diagrama visual del esquema

### 🎨 Documentación Frontend
- [Wireframes](docs/WIREFRAMES.md) - Diseños de pantallas principales
- [API Frontend](docs/API_FRONTEND.md) - Documentación completa de API para desarrollo frontend
- [Componentes UI](docs/UI_COMPONENTS.md) - Componentes reutilizables definidos
- [Plan Frontend](PLAN_FRONTEND.md) - Plan de desarrollo del frontend

## Estructura del Proyecto

```
WINM/
├── supabase/
│   ├── migrations/          # Migraciones SQL (001-008)
│   └── functions/          # Edge Functions (TypeScript)
├── scripts/
│   ├── email_parser/        # Parsers por banco
│   ├── utils/              # Utilidades compartidas
│   └── main.py             # Script principal
├── web-app/
│   ├── index.html           # Página principal
│   ├── css/                # Estilos
│   ├── js/
│   │   ├── components/     # Componentes UI
│   │   ├── services/       # Servicios (Supabase, transacciones)
│   │   └── utils/          # Utilidades
│   └── assets/             # Recursos estáticos
├── docs/                    # Documentación completa
├── .env                     # Variables de entorno (no en git)
├── requirements.txt         # Dependencias Python
└── README.md               # Este archivo
```

## Funcionalidades Principales

### ✅ Implementadas
- **Captura Automática**: Scripts Python leen emails de bancos y extraen transacciones
- **Auto-categorización**: Reglas automáticas basadas en descripción
- **Dashboard Visual**: Gráficos de gastos por categoría y tendencias mensuales
- **Filtros Avanzados**: Por categoría, fuente, tipo, período y búsqueda
- **Categorización Manual**: Modal para categorizar retiros pendientes
- **Alertas de Presupuesto**: Edge Functions envían emails cuando se alcanza threshold

### ⏳ Pendientes
- Crear/editar categorías personalizadas
- Crear/editar reglas de auto-categorización
- Edición de transacciones
- Temas claro/oscuro

## Comandos Útiles

```bash
# Validar configuración
python scripts/validate_environment.py

# Ejecutar captura de transacciones
python scripts/main.py

# Ejecutar migraciones
python scripts/run_migrations_cli.py

# Verificar base de datos
python scripts/verify_database_complete.py

# Desplegar Edge Function
supabase functions deploy send-budget-alert-email

# Ver logs de Edge Function
supabase functions logs send-budget-alert-email
```

## Enlaces Útiles

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase Python Client](https://github.com/supabase/supabase-py)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)

## Soporte y Documentación

Para más información, consulta:
- **[Contexto General del Proyecto](docs/CONTEXTO_GENERAL_PROYECTO.md)** ⭐ - Documento maestro con toda la información
- [Guía de Migraciones](docs/MIGRATION_GUIDE.md) - Cómo ejecutar migraciones
- [API Frontend](docs/API_FRONTEND.md) - Documentación completa de la API
- [Plan Frontend](PLAN_FRONTEND.md) - Estado y próximos pasos del frontend

## Licencia

Uso personal privado.
