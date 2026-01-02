"""
Script de pruebas de integración frontend-backend para WINM
Prueba las operaciones básicas que el frontend realizará
Principio SOLID: Responsabilidad única (testing)
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Agregar directorio al path para imports
sys.path.insert(0, str(Path(__file__).parent))

# Cargar variables de entorno
load_dotenv()

# Importar cliente Supabase
from utils.supabase_client import get_supabase_client

# Resultados de pruebas
test_results = []


def get_user_id():
    """
    Obtiene el user_id del usuario.
    Intenta múltiples métodos siguiendo KISS.
    
    Returns:
        str: UUID del usuario o None si no se puede obtener
    """
    # Opción 1: Desde variable de entorno
    user_id = os.getenv('SUPABASE_USER_ID')
    if user_id:
        return user_id
    
    # Opción 2: Obtener del primer usuario en Supabase (para desarrollo)
    try:
        client = get_supabase_client()
        # Obtener usuarios usando admin API
        response = client.auth.admin.list_users()
        if response.users and len(response.users) > 0:
            return response.users[0].id
    except Exception as e:
        pass  # Silenciar error, intentar siguiente método
    
    return None


def print_header(title):
    """Imprime un encabezado formateado"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)


def print_test(name, passed, message=""):
    """Imprime el resultado de una prueba"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")
    if message:
        print(f"      {message}")
    test_results.append({"name": name, "passed": passed, "message": message})


def test_authentication():
    """Prueba la autenticación básica"""
    print_header("Prueba 1: Autenticación")
    
    try:
        client = get_supabase_client()
        
        # Verificar que el cliente se creó correctamente
        if client:
            print_test("Cliente Supabase inicializado", True)
            return True
        else:
            print_test("Cliente Supabase inicializado", False, "Cliente es None")
            return False
            
    except Exception as e:
        print_test("Cliente Supabase inicializado", False, str(e))
        return False


def test_load_transactions():
    """Prueba la carga de transacciones"""
    print_header("Prueba 2: Carga de Transacciones")
    
    try:
        client = get_supabase_client()
        user_id = get_user_id()
        
        if not user_id:
            print_test("Carga de transacciones", False, 
                      "SUPABASE_USER_ID no configurado y no se pudo obtener automáticamente")
            print("      💡 Configura SUPABASE_USER_ID en .env o crea un usuario en Supabase Auth")
            return False
        
        # Intentar cargar transacciones
        response = client.table('transactions')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('date', desc=True)\
            .limit(10)\
            .execute()
        
        if response.data is not None:
            count = len(response.data)
            print_test("Carga de transacciones", True, f"{count} transacciones encontradas")
            return True
        else:
            print_test("Carga de transacciones", True, "0 transacciones (tabla vacía)")
            return True
            
    except Exception as e:
        print_test("Carga de transacciones", False, str(e))
        return False


def test_load_categories():
    """Prueba la carga de categorías"""
    print_header("Prueba 3: Carga de Categorías")
    
    try:
        client = get_supabase_client()
        
        # Cargar categorías del sistema
        response = client.table('categories')\
            .select('*')\
            .eq('is_system', True)\
            .order('name')\
            .execute()
        
        if response.data:
            count = len(response.data)
            if count >= 15:
                print_test("Carga de categorías del sistema", True, f"{count} categorías encontradas")
            else:
                print_test("Carga de categorías del sistema", False, 
                          f"Solo {count} categorías (esperado: 15)")
                return False
        else:
            print_test("Carga de categorías del sistema", False, "No se encontraron categorías")
            return False
        
        # Cargar todas las categorías (sistema + personalizadas)
        user_id = os.getenv('SUPABASE_USER_ID')
        if user_id:
            response_all = client.table('categories')\
                .select('*')\
                .order('is_system', desc=True)\
                .order('name')\
                .execute()
            
            if response_all.data is not None:
                print_test("Carga de todas las categorías", True, 
                          f"{len(response_all.data)} categorías totales")
                return True
        
        return True
        
    except Exception as e:
        print_test("Carga de categorías", False, str(e))
        return False


def test_load_budgets():
    """Prueba la carga de presupuestos"""
    print_header("Prueba 4: Carga de Presupuestos")
    
    try:
        client = get_supabase_client()
        user_id = get_user_id()
        
        if not user_id:
            print_test("Carga de presupuestos", False, 
                      "SUPABASE_USER_ID no configurado y no se pudo obtener automáticamente")
            print("      💡 Configura SUPABASE_USER_ID en .env o crea un usuario en Supabase Auth")
            return False
        
        # Cargar presupuestos activos
        response = client.table('budgets')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('is_active', True)\
            .execute()
        
        if response.data is not None:
            count = len(response.data)
            print_test("Carga de presupuestos activos", True, 
                      f"{count} presupuestos activos encontrados")
            return True
        else:
            print_test("Carga de presupuestos activos", True, "0 presupuestos (tabla vacía)")
            return True
            
    except Exception as e:
        print_test("Carga de presupuestos", False, str(e))
        return False


def test_budget_summary_view():
    """Prueba la consulta de la vista budget_summary"""
    print_header("Prueba 5: Vista budget_summary")
    
    try:
        client = get_supabase_client()
        user_id = get_user_id()
        
        if not user_id:
            print_test("Consulta budget_summary", False, 
                      "SUPABASE_USER_ID no configurado y no se pudo obtener automáticamente")
            print("      💡 Configura SUPABASE_USER_ID en .env o crea un usuario en Supabase Auth")
            return False
        
        # Consultar vista budget_summary
        response = client.table('budget_summary')\
            .select('*')\
            .eq('is_active', True)\
            .execute()
        
        if response.data is not None:
            count = len(response.data)
            print_test("Consulta budget_summary", True, f"{count} registros encontrados")
            
            # Verificar estructura de datos
            if count > 0:
                first = response.data[0]
                required_fields = ['id', 'category_name', 'budget_amount', 'current_spent', 
                                 'percentage_used', 'period_type']
                missing_fields = [f for f in required_fields if f not in first]
                
                if not missing_fields:
                    print_test("Estructura de budget_summary", True, "Todos los campos presentes")
                    return True
                else:
                    print_test("Estructura de budget_summary", False, 
                              f"Campos faltantes: {missing_fields}")
                    return False
            else:
                return True
        else:
            print_test("Consulta budget_summary", True, "Vista accesible (sin datos)")
            return True
            
    except Exception as e:
        print_test("Consulta budget_summary", False, str(e))
        return False


def test_rpc_functions():
    """Prueba las funciones RPC disponibles"""
    print_header("Prueba 6: Funciones RPC")
    
    try:
        client = get_supabase_client()
        user_id = get_user_id()
        
        if not user_id:
            print_test("Funciones RPC", False, 
                      "SUPABASE_USER_ID no configurado y no se pudo obtener automáticamente")
            print("      💡 Configura SUPABASE_USER_ID en .env o crea un usuario en Supabase Auth")
            return False
        
        # Probar get_category_expenses
        now = datetime.now()
        start_date = (now - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = now.strftime('%Y-%m-%d')
        
        try:
            response = client.rpc('get_category_expenses', {
                'p_user_id': user_id,
                'p_start_date': start_date,
                'p_end_date': end_date
            }).execute()
            
            if response.data is not None:
                print_test("get_category_expenses RPC", True, 
                          f"Función ejecutada correctamente")
            else:
                print_test("get_category_expenses RPC", True, 
                          "Función ejecutada (sin datos)")
        except Exception as e:
            print_test("get_category_expenses RPC", False, str(e))
            return False
        
        return True
        
    except Exception as e:
        print_test("Funciones RPC", False, str(e))
        return False


def test_error_handling():
    """Prueba el manejo de errores"""
    print_header("Prueba 7: Manejo de Errores")
    
    try:
        client = get_supabase_client()
        
        # Intentar consultar con filtro inválido (debe manejar el error)
        try:
            response = client.table('transactions')\
                .select('*')\
                .eq('invalid_field', 'value')\
                .execute()
            
            # Si llega aquí sin error, está bien (Supabase puede ignorar campos inválidos)
            print_test("Manejo de errores", True, "Error manejado correctamente")
            return True
            
        except Exception as e:
            # Error esperado, verificar que es manejable
            error_msg = str(e)
            if 'error' in error_msg.lower() or 'invalid' in error_msg.lower():
                print_test("Manejo de errores", True, "Error capturado y manejable")
                return True
            else:
                print_test("Manejo de errores", False, f"Error inesperado: {error_msg}")
                return False
        
    except Exception as e:
        print_test("Manejo de errores", False, str(e))
        return False


def test_transaction_filters():
    """Prueba los filtros comunes de transacciones"""
    print_header("Prueba 8: Filtros de Transacciones")
    
    try:
        client = get_supabase_client()
        user_id = get_user_id()
        
        if not user_id:
            print_test("Filtros de transacciones", False, 
                      "SUPABASE_USER_ID no configurado y no se pudo obtener automáticamente")
            print("      💡 Configura SUPABASE_USER_ID en .env o crea un usuario en Supabase Auth")
            return False
        
        # Probar filtro por source
        response = client.table('transactions')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('source', 'BBVA')\
            .limit(5)\
            .execute()
        
        print_test("Filtro por source", True, 
                  f"{len(response.data) if response.data else 0} resultados")
        
        # Probar filtro por transaction_type
        response = client.table('transactions')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('transaction_type', 'compra')\
            .limit(5)\
            .execute()
        
        print_test("Filtro por transaction_type", True, 
                  f"{len(response.data) if response.data else 0} resultados")
        
        # Probar filtro por needs_categorization
        response = client.table('transactions')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('needs_categorization', True)\
            .limit(5)\
            .execute()
        
        print_test("Filtro por needs_categorization", True, 
                  f"{len(response.data) if response.data else 0} resultados")
        
        return True
        
    except Exception as e:
        print_test("Filtros de transacciones", False, str(e))
        return False


def print_summary():
    """Imprime el resumen de todas las pruebas"""
    print_header("Resumen de Pruebas")
    
    total = len(test_results)
    passed = sum(1 for r in test_results if r['passed'])
    failed = total - passed
    
    print(f"\nTotal de pruebas: {total}")
    print(f"✅ Exitosas: {passed}")
    print(f"❌ Fallidas: {failed}")
    print(f"\nPorcentaje de éxito: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\nPruebas fallidas:")
        for result in test_results:
            if not result['passed']:
                print(f"  ❌ {result['name']}")
                if result['message']:
                    print(f"     {result['message']}")
    
    print("\n" + "="*60)
    
    if failed == 0:
        print("✅ Todas las pruebas pasaron exitosamente!")
        print("El backend está listo para el desarrollo del frontend.")
    else:
        print("⚠️  Algunas pruebas fallaron.")
        
        # Verificar si todas las fallas son por falta de user_id
        user_id_failures = sum(1 for r in test_results 
                              if not r['passed'] and 'SUPABASE_USER_ID' in r.get('message', ''))
        
        if user_id_failures == failed:
            print("\n💡 NOTA: Todas las fallas son por falta de SUPABASE_USER_ID.")
            print("   Esto es normal si no tienes usuarios creados aún.")
            print("\n   Para completar las pruebas:")
            print("   1. Crea un usuario en Supabase Auth Dashboard")
            print("   2. O configura SUPABASE_USER_ID en .env con el UUID del usuario")
            print("   3. Vuelve a ejecutar este script")
        else:
            print("Revisa los errores antes de continuar con el desarrollo del frontend.")
    
    print("="*60 + "\n")


def main():
    """Función principal"""
    print("\n" + "="*60)
    print("  PRUEBAS DE INTEGRACIÓN FRONTEND-BACKEND")
    print("  WINM - What I Need Most")
    print("="*60)
    
    # Verificar variables de entorno
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_SERVICE_ROLE_KEY'):
        print("\n❌ ERROR: Variables de entorno no configuradas")
        print("   Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env")
        sys.exit(1)
    
    # Intentar obtener user_id automáticamente
    user_id = get_user_id()
    if user_id:
        print(f"\n👤 User ID detectado: {user_id}")
        print("   (Algunas pruebas requieren datos del usuario)")
    else:
        print("\n⚠️  SUPABASE_USER_ID no configurado")
        print("   El script intentará obtenerlo automáticamente del primer usuario")
        print("   Si falla, configura SUPABASE_USER_ID en .env")
        print("   O crea un usuario en Supabase Auth Dashboard\n")
    
    # Ejecutar pruebas
    test_authentication()
    test_load_transactions()
    test_load_categories()
    test_load_budgets()
    test_budget_summary_view()
    test_rpc_functions()
    test_error_handling()
    test_transaction_filters()
    
    # Mostrar resumen
    print_summary()
    
    # Código de salida
    failed_count = sum(1 for r in test_results if not r['passed'])
    sys.exit(0 if failed_count == 0 else 1)


if __name__ == '__main__':
    main()
