"""
Script principal para capturar transacciones desde Gmail
WINM - What I Need Most
Principio KISS: Script simple y directo que orquesta el flujo
"""

import os
import sys
from pathlib import Path
from typing import Dict, Optional
from dotenv import load_dotenv

# Agregar directorio padre al path para imports
sys.path.insert(0, str(Path(__file__).parent))

from utils.email_client import get_gmail_service, get_bank_emails
from utils.supabase_client import insert_transaction, get_supabase_client
from email_parser import BBVAParser, MercadoPagoParser, NUParser, PlataCardParser

# Cargar variables de entorno
load_dotenv()

# Mapeo de dominios a parsers (SOLID: Open/Closed - fácil agregar nuevos)
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


def identify_bank_from_email(email_content: Dict) -> Optional[str]:
    """
    Identifica el banco basado en el remitente del email.
    Implementación simple (KISS).
    
    Args:
        email_content: Contenido del email con campo 'from'
    
    Returns:
        str: Nombre del parser a usar o None
    """
    from_email = email_content.get('from', '').lower()
    
    for domain, parser in BANK_PARSERS.items():
        if domain in from_email:
            return parser
    
    return None


def get_user_id() -> str:
    """
    Obtiene el user_id del usuario.
    Implementación simple (KISS).
    
    Returns:
        str: UUID del usuario
    
    Raises:
        ValueError: Si no se puede obtener el user_id
    """
    # Opción 1: Desde variable de entorno
    user_id = os.getenv('SUPABASE_USER_ID')
    if user_id:
        return user_id
    
    # Opción 2: Obtener del primer usuario en Supabase (para desarrollo)
    # En producción, esto debería venir de autenticación
    try:
        client = get_supabase_client()
        # Obtener usuarios (solo para desarrollo, en producción usar auth)
        # Nota: Esto requiere permisos de service role
        response = client.auth.admin.list_users()
        if response.users and len(response.users) > 0:
            return response.users[0].id
    except Exception as e:
        print(f"Advertencia: No se pudo obtener user_id automáticamente: {e}")
    
    # Opción 3: Pedir al usuario
    user_id = input("Ingresa tu user_id (UUID de Supabase): ").strip()
    if not user_id:
        raise ValueError("user_id es requerido. Configúralo en .env como SUPABASE_USER_ID")
    
    return user_id


def process_emails(user_id: str, days_back: int = 7):
    """
    Procesa emails de bancos y los inserta en Supabase.
    Función principal del flujo (KISS).
    
    Args:
        user_id: UUID del usuario en Supabase
        days_back: Días hacia atrás para buscar emails
    """
    print("="*60)
    print("WINM - Captura de Transacciones desde Gmail")
    print("="*60)
    
    # Dominios de bancos a buscar
    bank_domains = [
        'bbva.com',
        'bbva.com.mx',
        'mercadopago.com',
        'mercadopago.com.mx',
        'nu.com.mx',
        'nu.com',
        'plata.com.mx',
        'plata.com'
    ]
    
    print(f"\n📧 Buscando emails de los últimos {days_back} días...")
    print(f"   Bancos: {', '.join(set([d.split('.')[0] for d in bank_domains]))}")
    
    try:
        # Obtener emails de bancos
        emails = get_bank_emails(bank_domains, days_back)
        print(f"✅ Encontrados {len(emails)} emails")
        
        if not emails:
            print("No se encontraron emails de bancos")
            return
        
        # Procesar cada email
        processed = 0
        skipped = 0
        errors = 0
        
        for email in emails:
            try:
                # Identificar banco
                parser = identify_bank_from_email(email)
                if not parser:
                    print(f"⚠️  Email de remitente desconocido: {email.get('from', 'unknown')}")
                    skipped += 1
                    continue
                
                # Parsear email
                transaction = parser.parse(email)
                if not transaction:
                    skipped += 1
                    continue
                
                # Agregar user_id
                transaction['user_id'] = user_id
                
                # Insertar en Supabase
                inserted = insert_transaction(transaction)
                processed += 1
                print(f"✅ Procesada: {transaction['description'][:50]} - ${abs(transaction['amount']):.2f}")
                
            except Exception as e:
                errors += 1
                print(f"❌ Error procesando email {email.get('id', 'unknown')}: {e}")
                continue
        
        # Resumen
        print(f"\n{'='*60}")
        print("RESUMEN")
        print(f"{'='*60}")
        print(f"✅ Procesadas: {processed}")
        print(f"⏭️  Omitidas: {skipped}")
        print(f"❌ Errores: {errors}")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        sys.exit(1)


def main():
    """Función principal"""
    try:
        # Obtener user_id
        user_id = get_user_id()
        print(f"👤 Usuario: {user_id}")
        
        # Obtener días hacia atrás (opcional, default 7)
        days_back = int(os.getenv('DAYS_BACK', '7'))
        
        # Procesar emails
        process_emails(user_id, days_back)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Proceso cancelado por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
