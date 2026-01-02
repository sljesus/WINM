"""
Script para insertar datos de prueba en Supabase
WINM - What I Need Most
Principio KISS: Genera datos realistas para desarrollo
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Agregar directorio al path
sys.path.insert(0, str(Path(__file__).parent))

from utils.supabase_client import get_supabase_client, insert_transaction

load_dotenv()

# Datos de prueba realistas
TEST_TRANSACTIONS = [
    # Gastos - Supermercado
    {'amount': -450.50, 'description': 'Compra en Walmart', 'source': 'BBVA', 'transaction_type': 'compra'},
    {'amount': -320.00, 'description': 'Superama - Despensa', 'source': 'Mercado Pago', 'transaction_type': 'compra'},
    {'amount': -180.75, 'description': 'Chedraui - Frutas y verduras', 'source': 'NU', 'transaction_type': 'compra'},
    {'amount': -250.00, 'description': 'Soriana - Productos de limpieza', 'source': 'Plata Card', 'transaction_type': 'compra'},
    
    # Gastos - Restaurantes
    {'amount': -250.00, 'description': 'Restaurante El Portón', 'source': 'BBVA', 'transaction_type': 'compra'},
    {'amount': -180.00, 'description': 'Starbucks - Café y pastel', 'source': 'Mercado Pago', 'transaction_type': 'compra'},
    {'amount': -350.00, 'description': 'Cena en Italiannis', 'source': 'Plata Card', 'transaction_type': 'compra'},
    {'amount': -120.00, 'description': 'McDonalds - Comida rápida', 'source': 'NU', 'transaction_type': 'compra'},
    {'amount': -280.00, 'description': 'Pizza Hut - Entrega a domicilio', 'source': 'BBVA', 'transaction_type': 'compra'},
    
    # Gastos - Transporte
    {'amount': -50.00, 'description': 'Uber - Viaje al trabajo', 'source': 'NU', 'transaction_type': 'compra'},
    {'amount': -45.00, 'description': 'Gasolina - Pemex', 'source': 'BBVA', 'transaction_type': 'compra'},
    {'amount': -30.00, 'description': 'Metro - Recarga tarjeta', 'source': 'Mercado Pago', 'transaction_type': 'compra'},
    {'amount': -25.00, 'description': 'Didi - Viaje corto', 'source': 'NU', 'transaction_type': 'compra'},
    
    # Gastos - Servicios
    {'amount': -850.00, 'description': 'CFE - Luz', 'source': 'BBVA', 'transaction_type': 'compra'},
    {'amount': -450.00, 'description': 'Telmex - Internet', 'source': 'Mercado Pago', 'transaction_type': 'compra'},
    {'amount': -350.00, 'description': 'Totalplay - TV e Internet', 'source': 'NU', 'transaction_type': 'compra'},
    {'amount': -280.00, 'description': 'Aguas de México - Agua', 'source': 'BBVA', 'transaction_type': 'compra'},
    
    # Gastos - Compras
    {'amount': -1200.00, 'description': 'Amazon - Ropa', 'source': 'Plata Card', 'transaction_type': 'compra'},
    {'amount': -850.00, 'description': 'Liverpool - Zapatos', 'source': 'BBVA', 'transaction_type': 'compra'},
    {'amount': -450.00, 'description': 'Mercado Libre - Electrónica', 'source': 'Mercado Pago', 'transaction_type': 'compra'},
    {'amount': -650.00, 'description': 'Coppel - Electrodomésticos', 'source': 'NU', 'transaction_type': 'compra'},
    
    # Gastos - Entretenimiento
    {'amount': -350.00, 'description': 'Cinépolis - Películas', 'source': 'Mercado Pago', 'transaction_type': 'compra'},
    {'amount': -200.00, 'description': 'Netflix - Suscripción mensual', 'source': 'BBVA', 'transaction_type': 'compra'},
    {'amount': -150.00, 'description': 'Spotify Premium', 'source': 'NU', 'transaction_type': 'compra'},
    
    # Gastos - Salud
    {'amount': -450.00, 'description': 'Farmacia Guadalajara - Medicamentos', 'source': 'BBVA', 'transaction_type': 'compra'},
    {'amount': -800.00, 'description': 'Consulta médica', 'source': 'Mercado Pago', 'transaction_type': 'compra'},
    
    # Retiros (necesitan categorización)
    {'amount': -500.00, 'description': 'Retiro en cajero BBVA', 'source': 'BBVA', 'transaction_type': 'retiro', 'needs_categorization': True},
    {'amount': -1000.00, 'description': 'Retiro efectivo - ATM', 'source': 'NU', 'transaction_type': 'retiro', 'needs_categorization': True},
    {'amount': -300.00, 'description': 'Retiro en cajero Mercado Pago', 'source': 'Mercado Pago', 'transaction_type': 'retiro', 'needs_categorization': True},
    
    # Ingresos
    {'amount': 15000.00, 'description': 'Nómina - Empresa XYZ', 'source': 'BBVA', 'transaction_type': 'ingreso'},
    {'amount': 5000.00, 'description': 'Transferencia recibida', 'source': 'Mercado Pago', 'transaction_type': 'ingreso'},
    {'amount': 2500.00, 'description': 'Freelance - Proyecto ABC', 'source': 'NU', 'transaction_type': 'ingreso'},
    {'amount': 3000.00, 'description': 'Reembolso - Compra anterior', 'source': 'Plata Card', 'transaction_type': 'ingreso'},
]


def get_user_id():
    """
    Obtiene el user_id del usuario.
    Intenta múltiples métodos siguiendo KISS.
    
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
    try:
        client = get_supabase_client()
        response = client.auth.admin.list_users()
        if response.users and len(response.users) > 0:
            return response.users[0].id
    except Exception as e:
        print(f"⚠️  No se pudo obtener user_id automáticamente: {e}")
    
    # Opción 3: Pedir al usuario
    user_id = input("Ingresa tu user_id (UUID): ").strip()
    if not user_id:
        raise ValueError("user_id es requerido. Configúralo en .env como SUPABASE_USER_ID")
    return user_id


def generate_dates(count: int, days_back: int = 30):
    """
    Genera fechas distribuidas en los últimos días.
    
    Args:
        count: Número de fechas a generar
        days_back: Días hacia atrás desde hoy
        
    Returns:
        list: Lista de objetos datetime
    """
    dates = []
    now = datetime.now()
    for i in range(count):
        # Distribuir fechas uniformemente en el rango
        days_ago = random.randint(0, days_back)
        # Agregar variación de horas para más realismo
        hours_ago = random.randint(0, 23)
        date = now - timedelta(days=days_ago, hours=hours_ago)
        dates.append(date)
    return dates


def insert_test_data():
    """Inserta datos de prueba en Supabase"""
    print("="*60)
    print("  INSERTAR DATOS DE PRUEBA - WINM")
    print("="*60)
    
    # Obtener user_id
    try:
        user_id = get_user_id()
        print(f"\n👤 Usuario: {user_id}")
    except ValueError as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Opciones:")
        print("   1. Configura SUPABASE_USER_ID en .env")
        print("   2. Crea un usuario en Supabase Auth Dashboard")
        print("   3. Proporciona el UUID cuando se solicite")
        sys.exit(1)
    
    # Generar fechas
    dates = generate_dates(len(TEST_TRANSACTIONS), days_back=30)
    
    # Obtener cliente
    try:
        client = get_supabase_client()
    except Exception as e:
        print(f"\n❌ Error conectando a Supabase: {e}")
        print("   Verifica que SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén en .env")
        sys.exit(1)
    
    # Obtener categorías del sistema para asignar aleatoriamente
    try:
        categories_response = client.table('categories')\
            .select('id')\
            .eq('is_system', True)\
            .limit(15)\
            .execute()
        
        category_ids = [cat['id'] for cat in (categories_response.data or [])]
        
        if not category_ids:
            print("⚠️  No se encontraron categorías del sistema")
            print("   Las transacciones se insertarán sin categoría")
    except Exception as e:
        print(f"⚠️  No se pudieron cargar categorías: {e}")
        category_ids = []
    
    print(f"\n📊 Insertando {len(TEST_TRANSACTIONS)} transacciones...")
    print(f"   Categorías disponibles: {len(category_ids)}")
    
    inserted = 0
    skipped = 0
    errors = 0
    
    for i, transaction in enumerate(TEST_TRANSACTIONS):
        try:
            # Preparar datos
            transaction_data = {
                'user_id': user_id,
                'amount': float(transaction['amount']),  # Usar float en lugar de Decimal para JSON
                'description': transaction['description'],
                'date': dates[i].isoformat(),
                'source': transaction['source'],
                'bank': transaction['source'],  # Campo bank requerido (compatibilidad)
                'transaction_type': transaction['transaction_type'],
                'email_id': f'test-{user_id[:8]}-{i}-{int(datetime.now().timestamp())}',
                'email_subject': f'Notificación de prueba - {transaction["description"]}',
                'needs_categorization': transaction.get('needs_categorization', False)
            }
            
            # Asignar categoría aleatoria si no es retiro y hay categorías disponibles
            if not transaction_data['needs_categorization'] and category_ids:
                transaction_data['category_id'] = random.choice(category_ids)
            
            # Insertar
            insert_transaction(transaction_data)
            inserted += 1
            amount_str = f"${abs(transaction['amount']):.2f}"
            print(f"✅ {transaction['description'][:40]:<40} {amount_str:>10}")
            
        except Exception as e:
            error_msg = str(e).lower()
            if 'duplicate' in error_msg or 'unique' in error_msg or 'violates unique constraint' in error_msg:
                skipped += 1
                print(f"⏭️  Omitida (duplicado): {transaction['description'][:40]}")
            else:
                errors += 1
                print(f"❌ Error: {transaction['description'][:40]} - {str(e)[:50]}")
    
    # Resumen
    print(f"\n{'='*60}")
    print("RESUMEN")
    print(f"{'='*60}")
    print(f"✅ Insertadas: {inserted}")
    print(f"⏭️  Omitidas: {skipped}")
    print(f"❌ Errores: {errors}")
    print(f"{'='*60}\n")
    
    if inserted > 0:
        print("🎉 Datos de prueba insertados correctamente!")
        print("   Puedes verlos en el frontend ahora.")
        print(f"\n💡 Próximos pasos:")
        print("   1. Abre el frontend en http://localhost:8000/web-app/index.html")
        print("   2. Inicia sesión con tu usuario")
        print("   3. Verás las transacciones en el dashboard")
    elif skipped > 0:
        print("⚠️  Las transacciones ya existían (duplicados omitidos)")
        print("   Si quieres insertar más, modifica los datos de prueba o elimina las existentes")
    else:
        print("❌ No se insertaron transacciones. Revisa los errores arriba.")


if __name__ == '__main__':
    try:
        insert_test_data()
    except KeyboardInterrupt:
        print("\n\n⚠️  Proceso cancelado por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
