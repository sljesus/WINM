"""
Script para limpiar la base de datos de WINM
Elimina todos los datos de usuario para empezar desde cero
"""

import os
import sys
from pathlib import Path

# Agregar directorio padre al path
sys.path.insert(0, str(Path(__file__).parent))

from utils.supabase_client import get_supabase_client

def clear_database():
    """Limpia todas las tablas de datos de usuario"""
    print("Limpiando base de datos de WINM...")

    client = get_supabase_client()

    # Tablas a limpiar (en orden para respetar foreign keys)
    tables_to_clear = [
        'budget_alerts',
        'budgets',
        'transactions',
        'categorization_rules',
        'categories'  # Solo categorías personalizadas, las del sistema quedan
    ]

    try:
        for table in tables_to_clear:
            print(f"  Eliminando datos de {table}...")
            client.table(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()

        print("Base de datos limpiada exitosamente")
        print("\nAhora puedes ejecutar:")
        print("   python scripts/main.py")
        print("   Para consumir emails de Gmail y poblar la base de datos")

    except Exception as e:
        print(f"Error limpiando base de datos: {e}")
        sys.exit(1)

if __name__ == '__main__':
    clear_database()