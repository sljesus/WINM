"""
Cliente Supabase reutilizable para scripts de WINM
Sigue el principio KISS: Singleton simple y directo
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno
load_dotenv()

# Instancia única del cliente (Singleton pattern simple)
_client: Client = None


def get_supabase_client() -> Client:
    """
    Obtiene o crea la instancia única del cliente Supabase.
    
    Returns:
        Client: Cliente de Supabase configurado
        
    Raises:
        ValueError: Si las variables de entorno no están configuradas
    """
    global _client
    
    if _client is None:
        url = os.getenv('SUPABASE_URL')
        service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not url or not service_key:
            raise ValueError(
                "Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY "
                "deben estar configuradas en el archivo .env"
            )
        
        _client = create_client(url, service_key)
    
    return _client


def insert_transaction(transaction_data: dict) -> dict:
    """
    Inserta una transacción en Supabase.
    
    Args:
        transaction_data: Diccionario con los datos de la transacción:
            - amount: float o Decimal
            - description: str
            - date: str (ISO format) o datetime
            - category: str (opcional)
            - bank: str
            - user_id: str (UUID del usuario)
    
    Returns:
        dict: Datos de la transacción insertada
        
    Raises:
        Exception: Si hay error al insertar
    """
    client = get_supabase_client()
    
    response = client.table('transactions').insert(transaction_data).execute()
    
    if response.data:
        return response.data[0]
    else:
        raise Exception("No se pudo insertar la transacción")


def get_user_transactions(user_id: str, limit: int = 100) -> list:
    """
    Obtiene las transacciones de un usuario.
    
    Args:
        user_id: UUID del usuario
        limit: Número máximo de transacciones a obtener
    
    Returns:
        list: Lista de transacciones
    """
    client = get_supabase_client()
    
    response = client.table('transactions')\
        .select('*')\
        .eq('user_id', user_id)\
        .order('date', desc=True)\
        .limit(limit)\
        .execute()
    
    return response.data if response.data else []
