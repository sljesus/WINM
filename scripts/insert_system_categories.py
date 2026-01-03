"""
Script para insertar categorías del sistema en WINM
Ejecuta solo el INSERT de categorías predefinidas
"""

import os
import sys
from pathlib import Path

# Agregar directorio padre al path
sys.path.insert(0, str(Path(__file__).parent))

from utils.supabase_client import get_supabase_client

def insert_system_categories():
    """Inserta las categorías del sistema predefinidas"""
    print("Insertando categorias del sistema...")

    client = get_supabase_client()

    # Categorías del sistema predefinidas
    system_categories = [
        ('Alimentos y Bebidas', 'food', '#FF6B6B'),
        ('Transporte', 'car', '#4ECDC4'),
        ('Compras', 'shopping', '#45B7D1'),
        ('Entretenimiento', 'movie', '#FFA07A'),
        ('Servicios', 'home', '#98D8C8'),
        ('Salud', 'medical', '#F7DC6F'),
        ('Educación', 'book', '#BB8FCE'),
        ('Ropa', 'shirt', '#85C1E2'),
        ('Restaurantes', 'restaurant', '#F8B739'),
        ('Gasolina', 'gas', '#52BE80'),
        ('Supermercado', 'cart', '#5DADE2'),
        ('Servicios Públicos', 'light', '#F1948A'),
        ('Internet/Teléfono', 'wifi', '#AED6F1'),
        ('Seguros', 'shield', '#A569BD'),
        ('Otros', 'more', '#95A5A6')
    ]

    try:
        inserted = 0
        for name, icon, color in system_categories:
            # Insertar con ON CONFLICT DO NOTHING
            result = client.table('categories').insert({
                'name': name,
                'icon': icon,
                'color': color,
                'is_system': True,
                'user_id': None
            }).execute()

            if result.data:
                inserted += 1
                print(f"  Insertada: {name}")

        print(f"\nCategorias del sistema insertadas: {inserted}")
        print("Base de datos lista para recibir transacciones")

    except Exception as e:
        print(f"Error insertando categorias: {e}")
        sys.exit(1)

if __name__ == '__main__':
    insert_system_categories()