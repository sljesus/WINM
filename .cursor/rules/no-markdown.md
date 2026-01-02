# No Crear Archivos Markdown Automáticamente

## Regla Principal
- **NO crear archivos .md automáticamente en modo agent**
- Solo crear archivos MD cuando el usuario lo solicite **EXPLÍCITAMENTE**
- NO crear archivos de estado, resumen o temporal
- NO crear archivos de documentación sin solicitud explícita

## Excepciones Permitidas
- ✅ Actualizar archivos existentes en `docs/` está permitido
- ✅ Crear documentación técnica cuando sea necesario y **solicitado explícitamente**
- ✅ Actualizar README.md cuando sea necesario para el proyecto
- ✅ Crear archivos en `docs/` solo cuando el usuario lo pida

## Archivos que NO Deben Crearse Automáticamente

### Archivos de Estado/Temporal
- `ESTADO_*.md`
- `SIGUIENTE_PASO.md`
- `RESUMEN_*.md`
- `CHECKLIST_*.md` (temporal)
- `EJECUTAR_*.md`
- `QUICK_START_*.md`
- `SOLUCION_*.md`
- Cualquier archivo con nombre que indique estado temporal

### Archivos de Documentación Redundante
- Archivos que dupliquen información ya en `docs/`
- Archivos de "guía rápida" que ya existen
- Archivos de resumen que consolidan información existente

### Archivos de Planificación Temporal
- Archivos de "próximos pasos"
- Archivos de "tareas pendientes"
- Archivos de "notas de desarrollo"

## Si Necesitas Documentar

### Opción 1: Actualizar Archivos Existentes
- Actualiza `docs/CONTEXTO_GENERAL_PROYECTO.md` para contexto general
- Actualiza `docs/MIGRATION_GUIDE.md` para guías de migración
- Actualiza `docs/ARCHITECTURE.md` para arquitectura
- Actualiza `README.md` para información general

### Opción 2: Usar Comentarios en Código
- Agregar comentarios en código cuando sea apropiado
- Usar docstrings en Python
- Usar comentarios en SQL cuando sea necesario

### Opción 3: Preguntar al Usuario
- Si necesitas crear un archivo MD, pregunta primero
- Explica por qué es necesario
- Espera confirmación antes de crear

## Ejemplos de Comportamiento Correcto

### ✅ Correcto
```
Usuario: "Actualiza la documentación de migraciones"
Agente: Actualiza docs/MIGRATION_GUIDE.md

Usuario: "Crea un archivo de instrucciones para el frontend"
Agente: Crea docs/FRONTEND_INSTRUCTIONS.md (solicitado explícitamente)
```

### ❌ Incorrecto
```
Agente ejecuta tarea y crea automáticamente:
- ESTADO_EJECUCION.md
- RESUMEN_CAMBIOS.md
- SIGUIENTE_PASO.md
```

## Regla de Oro
**Cuando dudes, NO crees el archivo MD. Mejor actualiza uno existente o pregunta al usuario.**
