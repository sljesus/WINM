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

- **Backend**: Supabase (PostgreSQL + Auth + API REST)
- **Automatización**: Python 3.9+ con scripts específicos
- **Frontend**: HTML5, CSS3, JavaScript Vanilla (ES6+)
- **Gráficos**: Chart.js (via CDN)

## Inicio Rápido

### 1. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Obtener credenciales (URL y anon key)
3. Copiar `.env.example` a `.env` y completar las variables
4. Ejecutar migraciones desde `supabase/migrations/`

### 2. Configurar Scripts Python

```bash
# Instalar dependencias
pip install -r requirements.txt

# Configurar credenciales de Gmail API
# Colocar credentials.json en la raíz del proyecto
```

### 3. Configurar Frontend

1. Editar `web-app/js/config.js` con tus credenciales de Supabase
2. Abrir `web-app/index.html` en un navegador o servir estáticamente

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

## Enlaces Útiles

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase Python Client](https://github.com/supabase/supabase-py)

## Licencia

Uso personal privado.
