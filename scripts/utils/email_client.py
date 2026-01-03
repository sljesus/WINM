"""
Cliente Gmail API para scripts de WINM
Implementación simple siguiendo principio KISS
"""

import os
import base64
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Scopes necesarios para Gmail API
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# Instancia única del servicio (Singleton simple - KISS)
_service = None


def get_gmail_service():
    """
    Obtiene el servicio de Gmail autenticado.
    Singleton simple siguiendo principio KISS.
    
    Returns:
        Resource: Servicio de Gmail API
        
    Raises:
        FileNotFoundError: Si no se encuentra el archivo de credenciales
        Exception: Si hay error en la autenticación
    """
    global _service
    
    if _service is not None:
        return _service
    
    credentials_path = os.getenv('GMAIL_CREDENTIALS_PATH', './credentials.json')
    token_path = os.getenv('GMAIL_TOKEN_PATH', './token.json')
    
    creds = None
    
    # Cargar token existente si existe
    if Path(token_path).exists():
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    # Si no hay credenciales válidas, autenticar
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            # Refrescar token expirado
            creds.refresh(Request())
        else:
            # Primera vez: autenticación OAuth2
            if not Path(credentials_path).exists():
                raise FileNotFoundError(
                    f"Archivo de credenciales no encontrado: {credentials_path}\n"
                    "Descarga credentials.json desde Google Cloud Console:\n"
                    "1. Ve a https://console.cloud.google.com/\n"
                    "2. Crea un proyecto o selecciona uno existente\n"
                    "3. Habilita Gmail API\n"
                    "4. Crea credenciales OAuth 2.0\n"
                    "5. Descarga credentials.json"
                )
            
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Guardar token para próximas ejecuciones
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    
    # Construir servicio
    _service = build('gmail', 'v1', credentials=creds)
    return _service


def search_emails(query: str, max_results: int = 10) -> List[Dict]:
    """
    Busca correos electrónicos en Gmail.
    Implementación simple y directa (KISS).
    
    Args:
        query: Query de búsqueda (ej: "from:banco@bbva.com")
        max_results: Número máximo de resultados
    
    Returns:
        List[Dict]: Lista de mensajes con id y threadId
    """
    try:
        service = get_gmail_service()
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=max_results
        ).execute()
        
        messages = results.get('messages', [])
        return messages if messages else []
        
    except HttpError as error:
        print(f'Error buscando emails: {error}')
        return []


def get_email_content(message_id: str) -> Dict:
    """
    Obtiene el contenido completo de un email.
    Implementación simple (KISS).
    
    Args:
        message_id: ID del mensaje
    
    Returns:
        Dict: Contenido del mensaje con:
            - id: ID del mensaje
            - subject: Asunto
            - from: Remitente
            - date: Fecha
            - body: Cuerpo del mensaje (texto plano)
            - snippet: Resumen
    """
    try:
        service = get_gmail_service()
        message = service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()
        
        # Extraer headers
        headers = message.get('payload', {}).get('headers', [])
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
        from_email = next((h['value'] for h in headers if h['name'] == 'From'), '')
        date_str = next((h['value'] for h in headers if h['name'] == 'Date'), '')
        
        # Extraer cuerpo del mensaje
        body = _extract_body(message.get('payload', {}))
        
        return {
            'id': message_id,
            'subject': subject,
            'from': from_email,
            'date': date_str,
            'body': body,
            'snippet': message.get('snippet', ''),
            'threadId': message.get('threadId', '')
        }
        
    except HttpError as error:
        print(f'Error obteniendo email {message_id}: {error}')
        return {}


def get_raw_message(message_id: str) -> Dict:
    """
    Obtiene el mensaje completo sin procesar para análisis.
    Retorna el objeto Message completo de Gmail API.
    
    Args:
        message_id: ID del mensaje
    
    Returns:
        Dict: Objeto Message completo de Gmail API con payload estructurado
    """
    try:
        service = get_gmail_service()
        message = service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()
        return message
        
    except HttpError as error:
        print(f'Error obteniendo mensaje raw {message_id}: {error}')
        return {}


def _extract_body(payload: Dict) -> str:
    """
    Extrae el cuerpo del mensaje del payload.
    Helper simple (KISS).
    """
    body = ''
    
    if 'parts' in payload:
        # Mensaje multipart
        for part in payload['parts']:
            if part['mimeType'] == 'text/plain':
                data = part['body'].get('data', '')
                body = base64.urlsafe_b64decode(data).decode('utf-8')
                break
            elif part['mimeType'] == 'text/html' and not body:
                # Si no hay texto plano, usar HTML como fallback
                data = part['body'].get('data', '')
                body = base64.urlsafe_b64decode(data).decode('utf-8')
    else:
        # Mensaje simple
        if payload.get('mimeType') == 'text/plain':
            data = payload['body'].get('data', '')
            if data:
                body = base64.urlsafe_b64decode(data).decode('utf-8')
    
    return body


def get_bank_emails(bank_domains: List[str], days_back: int = 7) -> List[Dict]:
    """
    Obtiene emails de bancos específicos de los últimos N días.
    Implementación simple con filtros específicos (KISS).
    
    Args:
        bank_domains: Lista de dominios de bancos 
            (ej: ['bbva.com', 'mercadopago.com', 'nu.com.mx', 'plata.com.mx'])
        days_back: Número de días hacia atrás para buscar
    
    Returns:
        List[Dict]: Lista de emails completos con contenido
    """
    # Construir query simple
    # Formato: "from:dominio1.com OR from:dominio2.com newer_than:Nd"
    from_query = ' OR '.join([f'from:{domain}' for domain in bank_domains])
    query = f"({from_query}) newer_than:{days_back}d"
    
    # Buscar mensajes
    messages = search_emails(query, max_results=100)
    
    # Obtener contenido de cada mensaje
    emails = []
    for msg in messages:
        content = get_email_content(msg['id'])
        if content:
            emails.append(content)
    
    return emails
