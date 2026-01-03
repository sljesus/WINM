# Guía de Configuración de Gmail API

Guía paso a paso para configurar Gmail API y obtener credenciales OAuth2.

## Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Haz clic en el selector de proyectos (arriba a la izquierda)
3. Haz clic en "Nuevo Proyecto"
4. Nombre: "WINM" (o el que prefieras)
5. Haz clic en "Crear"

## Paso 2: Habilitar Gmail API

1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca "Gmail API"
3. Haz clic en "Gmail API"
4. Haz clic en **Enable** (Habilitar)

## Paso 3: Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Si es la primera vez, configura la pantalla de consentimiento:
   - **User Type**: External
   - **App name**: WINM
   - **User support email**: Tu email
   - **Developer contact**: Tu email
   - Haz clic en **Save and Continue**
   - En **Scopes**, haz clic en **Add or Remove Scopes**
   - Busca y selecciona: `https://www.googleapis.com/auth/gmail.readonly`
   - Haz clic en **Update** → **Save and Continue**
   - En **Test users**, agrega tu email de Gmail
   - Haz clic en **Save and Continue**

4. Crear OAuth Client ID:
   - **Application type**: Desktop app
   - **Name**: WINM Desktop Client
   - Haz clic en **Create**

5. Descargar credenciales:
   - Se abrirá un diálogo con tu Client ID y Client Secret
   - Haz clic en **Download JSON**
   - Guarda el archivo como `credentials.json` en la raíz del proyecto WINM

## Paso 4: Configurar Variables de Entorno

Agrega a tu archivo `.env`:

```env
GMAIL_CREDENTIALS_PATH=./credentials.json
GMAIL_TOKEN_PATH=./token.json
```

## Paso 5: Primera Ejecución

La primera vez que ejecutes el script, se abrirá tu navegador para autenticarte:

1. Ejecuta: `python scripts/main.py`
2. Se abrirá el navegador automáticamente
3. Selecciona tu cuenta de Gmail
4. Acepta los permisos (solo lectura de emails)
5. Se generará automáticamente `token.json`
6. Las siguientes ejecuciones usarán `token.json` (no necesitarás autenticarte de nuevo)

## Verificación

Para verificar que todo funciona:

```python
from scripts.utils.email_client import get_gmail_service, search_emails

service = get_gmail_service()
emails = search_emails('from:tu-email@gmail.com', max_results=5)
print(f"Encontrados {len(emails)} emails")
```

## Solución de Problemas

### Error: "redirect_uri_mismatch"
- Verifica que el tipo de aplicación sea "Desktop app" (no Web app)
- El flujo OAuth2 para desktop apps maneja redirects automáticamente

### Error: "access_denied"
- Verifica que tu email esté en la lista de "Test users" en OAuth consent screen
- Si la app está en modo producción, necesitarás verificar la app (no recomendado para uso personal)

### Error: "invalid_client"
- Verifica que `credentials.json` esté en la ruta correcta
- Verifica que el archivo JSON sea válido

### Token expirado
- Si `token.json` expira, simplemente elimínalo y vuelve a ejecutar
- El script refrescará el token automáticamente si tiene refresh_token

## Seguridad

- **NUNCA** subas `credentials.json` o `token.json` a Git
- Ambos archivos están en `.gitignore`
- Si comprometes las credenciales, revócalas en Google Cloud Console y crea nuevas

## Límites de Gmail API

- **Quota diario**: 1,000,000,000 unidades de quota por día (suficiente para uso personal)
- **Rate limit**: 250 requests por segundo por usuario
- Para uso personal, estos límites son más que suficientes
