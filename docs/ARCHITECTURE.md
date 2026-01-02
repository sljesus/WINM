# Arquitectura del Sistema WINM

## Visión General

WINM es un sistema de control financiero personal que opera completamente en la nube, utilizando Supabase como backend y scripts Python para automatización.

## Flujo de Datos

```
Gmail API → Scripts Python → Supabase → Frontend Web
```

### Proceso Detallado

1. **Captura**: Scripts Python se conectan a Gmail API y leen correos de bancos
2. **Procesamiento**: Los parsers extraen información de transacciones de los emails
3. **Almacenamiento**: Los datos se guardan en Supabase (PostgreSQL)
4. **Visualización**: El frontend web consulta Supabase y muestra las transacciones

## Componentes

### Backend (Supabase)

- **Base de Datos**: PostgreSQL gestionada por Supabase
- **Autenticación**: Supabase Auth (un solo usuario)
- **API**: REST auto-generada por Supabase
- **Seguridad**: Row Level Security (RLS) para proteger datos del usuario

### Scripts Python

- **Propósito**: Automatizar la captura de transacciones desde emails bancarios
- **Enfoque**: Scripts específicos para tareas específicas
- **Conexión**: Via biblioteca `supabase-py`
- **Parsers**: Módulos específicos por banco en `scripts/email_parser/`

### Frontend

- **Tecnología**: HTML5, CSS3, JavaScript Vanilla (ES6+)
- **Hosting**: Servicio estático (Vercel/Netlify/Firebase Hosting)
- **Responsive**: Mobile-first, funciona en móvil, tablet y computadora
- **Gráficos**: Chart.js para visualización de datos financieros

## Modelo de Datos

### Tabla: transactions

- `id` (UUID): Identificador único
- `amount` (decimal): Monto de la transacción
- `description` (text): Descripción de la transacción
- `date` (timestamp): Fecha de la transacción
- `category` (text, nullable): Categoría de la transacción
- `bank` (text): Banco origen de la transacción
- `created_at` (timestamp): Fecha de creación del registro

## Seguridad

- **Row Level Security (RLS)**: Solo el usuario autenticado puede ver sus transacciones
- **Variables de Entorno**: Credenciales sensibles nunca en el código
- **Privacidad**: Datos almacenados en cuenta personal de Supabase

## Decisiones de Diseño

### Por qué Supabase
- Backend completo sin gestión de servidores
- PostgreSQL robusto y escalable
- Autenticación integrada
- API REST automática

### Por qué Python para Scripts
- Excelente para procesamiento de texto (emails)
- Bibliotecas maduras para Gmail API
- Simple y directo (KISS)

### Por qué JavaScript Vanilla
- Sin dependencias pesadas
- Carga rápida
- Fácil de mantener
- Compatible con cualquier hosting estático

## Extensibilidad

La arquitectura está diseñada para ser extensible:

- **Nuevos Bancos**: Agregar nuevos parsers en `scripts/email_parser/`
- **Nuevas Categorías**: Extender el modelo de datos sin modificar código base
- **Nuevas Visualizaciones**: Agregar nuevas vistas en el frontend sin afectar el backend

## Próximas Mejoras

1. Categorización automática de transacciones
2. Alertas y notificaciones
3. Exportación de reportes
4. Integración con más bancos mexicanos
