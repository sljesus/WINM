# Scripts de Automatización WINM

Scripts Python para automatizar la captura de transacciones desde emails bancarios.

## Estructura

```
scripts/
├── email_parser/           # Parsers específicos por banco
│   ├── __init__.py
│   ├── base.py            # Clase base BaseParser (SOLID)
│   ├── bbva.py            # Parser para BBVA
│   ├── mercado_pago.py    # Parser para Mercado Pago
│   ├── nu.py              # Parser para NU
│   └── plata_card.py      # Parser para Plata Card
├── utils/                  # Utilidades compartidas
│   ├── supabase_client.py  # Cliente Supabase (Singleton)
│   └── email_client.py     # Cliente Gmail API (OAuth2)
├── main.py                 # Script principal
└── run_migrations.py       # Script para ejecutar migraciones
```

## Configuración

### 1. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto con:

```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
GMAIL_CREDENTIALS_PATH=./credentials.json
GMAIL_TOKEN_PATH=./token.json
```

### 2. Credenciales de Gmail API

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un proyecto o seleccionar uno existente
3. Habilitar Gmail API
4. Crear credenciales OAuth 2.0 (tipo "Desktop app")
5. Descargar `credentials.json` y colocarlo en la raíz del proyecto
6. Ejecutar el script por primera vez para generar `token.json` (se abrirá navegador para autenticación)

**Guía detallada:** Ver `docs/GMAIL_API_SETUP.md`

### 3. Instalación de Dependencias

```bash
# Desde la raíz del proyecto
pip install -r requirements.txt
```

## Uso

### Script Principal

El script principal `main.py` orquesta todo el flujo:

```bash
# Desde el directorio scripts/
python main.py
```

El script:
1. Se conecta a Gmail API
2. Busca emails de bancos (últimos 7 días por defecto)
3. Identifica el banco por remitente
4. Parsea cada email con el parser correspondiente
5. Inserta transacciones en Supabase
6. Muestra resumen de procesamiento

**Variables de entorno opcionales:**
- `DAYS_BACK`: Días hacia atrás para buscar (default: 7)
- `SUPABASE_USER_ID`: UUID del usuario (si no se proporciona, se pedirá)

### Cliente Supabase

```python
from utils.supabase_client import get_supabase_client, insert_transaction

# Obtener cliente (Singleton)
client = get_supabase_client()

# Insertar transacción
transaction = {
    'amount': -150.50,
    'description': 'Compra en supermercado',
    'date': '2025-12-31T10:00:00Z',
    'source': 'BBVA',
    'transaction_type': 'compra',
    'user_id': 'tu-user-id-uuid',
    'email_id': 'gmail-message-id',
    'email_subject': 'Notificación BBVA'
}

insert_transaction(transaction)
```

### Cliente Gmail

```python
from utils.email_client import get_gmail_service, get_bank_emails

# Obtener servicio (autenticación OAuth2 automática)
service = get_gmail_service()

# Buscar emails de bancos
bank_domains = ['bbva.com', 'mercadopago.com', 'nu.com.mx', 'plata.com.mx']
emails = get_bank_emails(bank_domains, days_back=7)

# Cada email tiene: id, subject, from, date, body, snippet
```

### Parsers

```python
from email_parser import BBVAParser, MercadoPagoParser

# Crear parser
parser = BBVAParser()

# Parsear email
email_content = {
    'subject': 'Compra BBVA',
    'body': 'Cargo por $150.50 en Supermercado...',
    'from': 'notificaciones@bbva.com.mx',
    'date': '2025-12-31T10:00:00Z',
    'id': 'gmail-message-id'
}

transaction = parser.parse(email_content)
# Retorna dict con formato estándar o None si no es transacción válida
```

## Formato de Transacción

Formato estándar que todos los parsers deben retornar:

```python
{
    'amount': float,              # Monto (negativo para gastos, positivo para ingresos)
    'description': str,           # Descripción/concepto
    'date': str,                  # ISO format: 'YYYY-MM-DDTHH:MM:SSZ'
    'source': str,                # 'BBVA', 'Mercado Pago', 'NU', 'Plata Card'
    'transaction_type': str,      # 'compra', 'ingreso', 'retiro', 'transferencia', 'otro'
    'email_id': str,              # ID del email de Gmail
    'email_subject': str,         # Asunto del email
    'needs_categorization': bool, # TRUE para retiros (requiere que usuario indique en qué se gastó)
    'bank': str                   # Compatibilidad (igual que source)
}
```

## Desarrollo de Parsers

Cada banco tiene su propio parser que hereda de `BaseParser`:

1. **Implementar método `parse()`**: Recibe email_content y retorna transacción o None
2. **Usar helpers de BaseParser**: `extract_amount()`, `extract_date()`, `normalize_description()`
3. **Validar con `validate_transaction()`**: Antes de retornar

Ver ejemplos en `email_parser/bbva.py`, `email_parser/mercado_pago.py`, etc.

## Ejecución Automática

### Windows (Task Scheduler)

1. Abrir Task Scheduler
2. Crear tarea básica
3. Trigger: Diario a las 6:00 AM
4. Acción: Iniciar programa
   - Programa: `python`
   - Argumentos: `C:\ruta\al\proyecto\scripts\main.py`
   - Directorio: `C:\ruta\al\proyecto\scripts`

### Linux/Mac (Cron)

```bash
# Editar crontab
crontab -e

# Ejecutar diario a las 6:00 AM
0 6 * * * cd /ruta/al/proyecto/scripts && python main.py >> /var/log/winm.log 2>&1
```

## Notas Importantes

- **Seguridad**: Los scripts usan `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS (solo para scripts automatizados)
- **Autenticación**: El `user_id` debe ser válido y existir en Supabase Auth
- **Duplicados**: El sistema evita duplicados usando `email_id` (único por usuario)
- **Retiros**: Los retiros se marcan con `needs_categorization=TRUE` para que el usuario indique en qué se gastó
- **Filtrado**: Los parsers filtran automáticamente emails que no son transacciones (promociones, publicidad, etc.)

## Solución de Problemas

### Error: "Archivo de credenciales no encontrado"
- Verifica que `credentials.json` esté en la raíz del proyecto
- O configura `GMAIL_CREDENTIALS_PATH` en `.env`

### Error: "user_id es requerido"
- Configura `SUPABASE_USER_ID` en `.env`
- O proporciona el UUID cuando el script lo solicite

### Error: "No se encontraron emails"
- Verifica que tengas emails de bancos en tu Gmail
- Aumenta `DAYS_BACK` en `.env` o como parámetro

### Error de autenticación Gmail
- Elimina `token.json` y vuelve a ejecutar para reautenticar
- Verifica que las credenciales OAuth2 sean válidas
