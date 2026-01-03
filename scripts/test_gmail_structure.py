"""
Script de prueba para verificar estructura real de emails de Gmail API
WINM - What I Need Most
Principio KISS: Script simple para debugging y validación
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Optional
from dotenv import load_dotenv

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Agregar directorio padre al path para imports
sys.path.insert(0, str(Path(__file__).parent))

from utils.email_client import get_gmail_service, get_bank_emails, get_email_content, get_raw_message
from email_parser import BBVAParser, MercadoPagoParser, NUParser, PlataCardParser

# Cargar variables de entorno
load_dotenv()

# Mapeo de dominios a parsers
BANK_PARSERS = {
    'bbva.com': BBVAParser(),
    'bbva.com.mx': BBVAParser(),
    'mercadopago.com': MercadoPagoParser(),
    'mercadopago.com.mx': MercadoPagoParser(),
    'nu.com.mx': NUParser(),
    'nu.com': NUParser(),
    'plata.com.mx': PlataCardParser(),
    'plata.com': PlataCardParser(),
}


def identify_bank_from_email(email_content: Dict) -> Optional:
    """Identifica el banco basado en el remitente del email"""
    from_email = email_content.get('from', '').lower()
    
    for domain, parser in BANK_PARSERS.items():
        if domain in from_email:
            return parser
    
    return None


def print_separator(title: str = ""):
    """Imprime un separador visual"""
    print("\n" + "="*80)
    if title:
        print(f"  {title}")
        print("="*80)
    print()


def print_email_structure(email: dict, show_full: bool = False):
    """Imprime la estructura completa de un email"""
    print_separator("ESTRUCTURA DEL EMAIL")
    
    print("📧 INFORMACIÓN BÁSICA:")
    print(f"   ID: {email.get('id', 'N/A')}")
    print(f"   Thread ID: {email.get('threadId', 'N/A')}")
    print(f"   From: {email.get('from', 'N/A')}")
    print(f"   Subject: {email.get('subject', 'N/A')}")
    print(f"   Date: {email.get('date', 'N/A')}")
    print(f"   Snippet: {email.get('snippet', 'N/A')[:100]}...")
    
    print("\n📄 CUERPO DEL MENSAJE:")
    body = email.get('body', '')
    if body:
        # Mostrar primeros 500 caracteres
        body_preview = body[:500] if len(body) > 500 else body
        print(f"   Longitud: {len(body)} caracteres")
        print(f"   Preview (primeros 500 chars):")
        print("   " + "-"*76)
        for line in body_preview.split('\n')[:20]:  # Primeras 20 líneas
            print(f"   {line}")
        if len(body) > 500:
            print("   ... (truncado)")
    else:
        print("   ⚠️  Cuerpo vacío")
    
    if show_full:
        print("\n📋 ESTRUCTURA COMPLETA (JSON):")
        print(json.dumps(email, indent=2, ensure_ascii=False))


def print_payload_structure(payload: dict):
    """Muestra estructura del payload completo"""
    print_separator("ESTRUCTURA DEL PAYLOAD")
    
    if not payload:
        print("⚠️  Payload vacío o no disponible")
        return
    
    print(f"📦 TIPO DE MENSAJE:")
    mime_type = payload.get('mimeType', 'N/A')
    print(f"   MIME Type: {mime_type}")
    
    if 'parts' in payload:
        print(f"   Tipo: Multipart ({len(payload.get('parts', []))} partes)")
        
        print(f"\n📎 PARTES DEL MENSAJE:")
        for i, part in enumerate(payload.get('parts', []), 1):
            part_mime = part.get('mimeType', 'N/A')
            part_size = part.get('body', {}).get('size', 0)
            has_data = bool(part.get('body', {}).get('data'))
            
            print(f"   Parte {i}:")
            print(f"      MIME Type: {part_mime}")
            print(f"      Tamaño: {part_size} bytes")
            print(f"      Tiene datos: {'Sí' if has_data else 'No'}")
            
            # Si tiene parts anidadas
            if 'parts' in part:
                print(f"      Sub-partes: {len(part.get('parts', []))}")
    else:
        print(f"   Tipo: Mensaje simple")
        body_size = payload.get('body', {}).get('size', 0)
        has_data = bool(payload.get('body', {}).get('data'))
        print(f"   Tamaño del body: {body_size} bytes")
        print(f"   Tiene datos: {'Sí' if has_data else 'No'}")
    
    # Mostrar headers disponibles
    headers = payload.get('headers', [])
    if headers:
        print(f"\n📋 HEADERS DISPONIBLES ({len(headers)}):")
        for header in headers[:10]:  # Primeros 10 headers
            name = header.get('name', 'N/A')
            value = header.get('value', 'N/A')
            value_preview = value[:60] + '...' if len(value) > 60 else value
            print(f"   {name}: {value_preview}")
        if len(headers) > 10:
            print(f"   ... y {len(headers) - 10} headers más")


def print_parsed_transaction(email: dict, parser):
    """Intenta parsear el email y muestra el resultado"""
    print_separator("RESULTADO DEL PARSING")
    
    try:
        transaction = parser.parse(email)
        
        if transaction:
            print("✅ TRANSACCIÓN EXTRAÍDA EXITOSAMENTE:")
            print(f"   Descripción: {transaction.get('description', 'N/A')}")
            print(f"   Monto: ${abs(transaction.get('amount', 0)):.2f}")
            print(f"   Tipo: {transaction.get('transaction_type', 'N/A')}")
            print(f"   Fuente: {transaction.get('source', 'N/A')}")
            print(f"   Fecha: {transaction.get('date', 'N/A')}")
            print(f"   Necesita categorización: {transaction.get('needs_categorization', False)}")
            
            print("\n📝 DESCRIPCIÓN COMPLETA:")
            description = transaction.get('description', 'N/A')
            print(f"   '{description}'")
            print(f"   Longitud: {len(description)} caracteres")
            
            print("\n💡 PARA CREAR REGLA DE AUTO-CATEGORIZACIÓN:")
            print(f"   - Tipo: 'Contiene'")
            print(f"   - Patrón: Extraer palabra clave de '{description[:30]}...'")
            print(f"   - Ejemplo: Si la descripción contiene 'STARBUCKS', usar patrón 'STARBUCKS'")
            
        else:
            print("❌ NO SE PUDO EXTRAER TRANSACCIÓN")
            print("   El parser retornó None (probablemente no es una notificación de transacción)")
            print("\n💡 POSIBLES RAZONES:")
            print("   - El email no es una notificación de transacción")
            print("   - Falta información requerida (monto, descripción, etc.)")
            print("   - El formato del email no coincide con los patrones esperados")
            
    except Exception as e:
        print(f"❌ ERROR AL PARSEAR: {e}")
        import traceback
        traceback.print_exc()


def test_single_email(email_id: str = None, show_raw: bool = False):
    """Prueba con un email específico o busca uno automáticamente"""
    print_separator("PRUEBA DE ESTRUCTURA GMAIL API")
    
    try:
        # Si no se proporciona ID, buscar emails de bancos
        if not email_id:
            print("🔍 Buscando emails de bancos (últimos 7 días)...")
            
            bank_domains = [
                'bbva.com', 'bbva.com.mx',
                'mercadopago.com', 'mercadopago.com.mx',
                'nu.com.mx', 'nu.com',
                'plata.com.mx', 'plata.com'
            ]
            
            emails = get_bank_emails(bank_domains, days_back=7)
            
            if not emails:
                print("❌ No se encontraron emails de bancos")
                print("\n💡 SUGERENCIAS:")
                print("   1. Verifica que tengas emails de bancos en tu Gmail")
                print("   2. Ajusta el parámetro days_back si tus emails son más antiguos")
                print("   3. Verifica que las credenciales de Gmail API estén configuradas")
                return
            
            print(f"✅ Encontrados {len(emails)} emails")
            print(f"\n📧 Usando el primer email encontrado...")
            email = emails[0]
            
        else:
            print(f"📧 Obteniendo email con ID: {email_id}")
            email = get_email_content(email_id)
            
            if not email:
                print("❌ No se pudo obtener el email")
                return
        
        # Mostrar estructura del email
        print_email_structure(email, show_full=False)
        
        # Si se solicita estructura raw, obtener y mostrar payload completo
        if show_raw:
            raw_message = get_raw_message(email.get('id'))
            if raw_message:
                payload = raw_message.get('payload', {})
                print_payload_structure(payload)
        
        # Intentar parsear
        parser = identify_bank_from_email(email)
        if parser:
            print(f"\n🏦 Parser identificado: {parser.source_name}")
            print_parsed_transaction(email, parser)
        else:
            print("\n⚠️  No se pudo identificar el banco del remitente")
            print(f"   From: {email.get('from', 'N/A')}")
        
        # Preguntar si quiere ver estructura completa (solo en modo interactivo)
        if not show_raw:
            print("\n" + "="*80)
            try:
                response = input("¿Deseas ver la estructura completa en JSON? (s/n): ").strip().lower()
                if response == 's':
                    print_email_structure(email, show_full=True)
            except (EOFError, KeyboardInterrupt):
                pass
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


def test_multiple_emails(max_emails: int = 5):
    """Prueba con múltiples emails para ver patrones"""
    print_separator("PRUEBA MÚLTIPLE - ANÁLISIS DE PATRONES")
    
    try:
        bank_domains = [
            'bbva.com', 'bbva.com.mx',
            'mercadopago.com', 'mercadopago.com.mx',
            'nu.com.mx', 'nu.com',
            'plata.com.mx', 'plata.com'
        ]
        
        print(f"🔍 Buscando hasta {max_emails} emails de bancos...")
        emails = get_bank_emails(bank_domains, days_back=30)
        
        if not emails:
            print("❌ No se encontraron emails")
            return
        
        emails = emails[:max_emails]
        print(f"✅ Analizando {len(emails)} emails\n")
        
        descriptions_found = []
        
        for i, email in enumerate(emails, 1):
            print_separator(f"EMAIL {i}/{len(emails)}")
            print(f"From: {email.get('from', 'N/A')}")
            print(f"Subject: {email.get('subject', 'N/A')}")
            
            parser = identify_bank_from_email(email)
            if parser:
                transaction = parser.parse(email)
                if transaction:
                    description = transaction.get('description', 'N/A')
                    print(f"✅ Descripción extraída: '{description}'")
                    descriptions_found.append({
                        'from': email.get('from', 'N/A'),
                        'description': description,
                        'amount': transaction.get('amount', 0)
                    })
                else:
                    print("❌ No se pudo extraer transacción")
            else:
                print("⚠️  Parser no identificado")
            
            print("\n" + "-"*80)
        
        # Resumen de descripciones encontradas
        if descriptions_found:
            print_separator("RESUMEN DE DESCRIPCIONES ENCONTRADAS")
            print("Estas son las descripciones que se guardarían en la BD:")
            print("(Útiles para crear reglas de auto-categorización)\n")
            for i, desc_info in enumerate(descriptions_found, 1):
                print(f"{i}. '{desc_info['description']}'")
                print(f"   From: {desc_info['from']}")
                print(f"   Monto: ${abs(desc_info['amount']):.2f}\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


def test_raw_message_structure(message_id: str):
    """Muestra estructura completa del mensaje raw"""
    print_separator("ESTRUCTURA RAW DEL MENSAJE")
    
    try:
        raw_message = get_raw_message(message_id)
        
        if not raw_message:
            print("❌ No se pudo obtener el mensaje")
            return
        
        # Mostrar información básica
        print("📧 INFORMACIÓN BÁSICA:")
        print(f"   ID: {raw_message.get('id', 'N/A')}")
        print(f"   Thread ID: {raw_message.get('threadId', 'N/A')}")
        print(f"   Snippet: {raw_message.get('snippet', 'N/A')[:100]}...")
        print(f"   Tamaño estimado: {raw_message.get('sizeEstimate', 'N/A')} bytes")
        
        # Mostrar payload completo
        payload = raw_message.get('payload', {})
        print_payload_structure(payload)
        
        # Opción de ver JSON completo
        print("\n" + "="*80)
        try:
            response = input("¿Deseas ver el JSON completo del mensaje? (s/n): ").strip().lower()
            if response == 's':
                print("\n📋 JSON COMPLETO:")
                print(json.dumps(raw_message, indent=2, ensure_ascii=False))
        except (EOFError, KeyboardInterrupt):
            pass
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


def validate_credentials():
    """Valida que existan las credenciales necesarias"""
    credentials_path = os.getenv('GMAIL_CREDENTIALS_PATH', './credentials.json')
    token_path = os.getenv('GMAIL_TOKEN_PATH', './token.json')
    
    if not Path(credentials_path).exists():
        print("❌ ERROR: No se encontró credentials.json")
        print(f"   Ruta esperada: {credentials_path}")
        print("\n💡 CONFIGURACIÓN:")
        print("   1. Ve a https://console.cloud.google.com/")
        print("   2. Crea un proyecto o selecciona uno existente")
        print("   3. Habilita Gmail API")
        print("   4. Crea credenciales OAuth 2.0 (tipo Desktop app)")
        print("   5. Descarga credentials.json")
        return False
    
    return True


def main():
    """Función principal"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Prueba estructura de emails de Gmail API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python test_gmail_structure.py                    # Prueba con primer email encontrado
  python test_gmail_structure.py --multiple --max 10 # Prueba con 10 emails
  python test_gmail_structure.py --email-id "ID"     # Prueba con email específico
  python test_gmail_structure.py --email-id "ID" --raw # Ver estructura raw completa
        """
    )
    parser.add_argument('--email-id', type=str, help='ID específico del email a probar')
    parser.add_argument('--multiple', action='store_true', help='Probar con múltiples emails')
    parser.add_argument('--max', type=int, default=5, help='Máximo de emails para prueba múltiple (default: 5)')
    parser.add_argument('--raw', action='store_true', help='Mostrar estructura raw completa del payload')
    
    args = parser.parse_args()
    
    try:
        # Validar credenciales
        if not validate_credentials():
            sys.exit(1)
        
        # Ejecutar prueba según argumentos
        if args.multiple:
            test_multiple_emails(max_emails=args.max)
        elif args.email_id:
            if args.raw:
                test_raw_message_structure(args.email_id)
            else:
                test_single_email(email_id=args.email_id, show_raw=args.raw)
        else:
            test_single_email(show_raw=args.raw)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Proceso cancelado por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
