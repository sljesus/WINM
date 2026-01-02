"""
Utilidades compartidas para scripts de WINM
"""

from .supabase_client import get_supabase_client, insert_transaction, get_user_transactions

__all__ = [
    'get_supabase_client',
    'insert_transaction',
    'get_user_transactions'
]
