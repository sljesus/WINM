"""
Script de validación del ambiente WINM
Verifica que todos los componentes estén configurados correctamente
"""

import os
import sys
from pathlib import Path
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

def check_env_variables():
    """Verifica variables de entorno requeridas"""
    print("="*60)
    print("1. Verificando Variables de Entorno")
    print("="*60)
    
    required_vars = {
        'SUPABASE_URL': 'URL de Supabase',
        'SUPABASE_SERVICE_ROLE_KEY': 'Service Role Key de Supabase',
    }
    
    optional_vars = {
        'SUPABASE_USER_ID': 'User ID (opcional)',
        'GMAIL_CREDENTIALS_PATH': 'Ruta a credentials.json (opcional)',
        'GMAIL_TOKEN_PATH': 'Ruta a token.json (opcional)',
        'DAYS_BACK': 'Días hacia atrás para buscar emails (opcional)',
    }
    
    all_ok = True
    
    for var, description in required_vars.items():
        value = os.getenv(var)
        if value:
            print(f"[OK] {var}: Configurada")
        else:
            print(f"[ERROR] {var}: NO configurada - {description}")
            all_ok = False
    
    for var, description in optional_vars.items():
        value = os.getenv(var)
        if value:
            print(f"[OK] {var}: {value}")
        else:
            print(f"[WARN] {var}: No configurada (opcional) - {description}")
    
    return all_ok


def check_files():
    """Verifica archivos requeridos"""
    print("\n" + "="*60)
    print("2. Verificando Archivos")
    print("="*60)
    
    project_root = Path(__file__).parent.parent
    
    required_files = {
        'requirements.txt': 'Dependencias Python',
        'scripts/main.py': 'Script principal',
        'scripts/utils/supabase_client.py': 'Cliente Supabase',
        'scripts/utils/email_client.py': 'Cliente Gmail',
        'scripts/email_parser/base.py': 'Parser base',
        'scripts/email_parser/bbva.py': 'Parser BBVA',
        'scripts/email_parser/mercado_pago.py': 'Parser Mercado Pago',
        'scripts/email_parser/nu.py': 'Parser NU',
        'scripts/email_parser/plata_card.py': 'Parser Plata Card',
    }
    
    optional_files = {
        'credentials.json': 'Credenciales Gmail API (se genera al configurar)',
        'token.json': 'Token Gmail API (se genera en primera ejecución)',
        '.env': 'Variables de entorno',
    }
    
    all_ok = True
    
    for file_path, description in required_files.items():
        full_path = project_root / file_path
        if full_path.exists():
            print(f"[OK] {file_path}: Existe")
        else:
            print(f"[ERROR] {file_path}: NO existe - {description}")
            all_ok = False
    
    for file_path, description in optional_files.items():
        full_path = project_root / file_path
        if full_path.exists():
            print(f"[OK] {file_path}: Existe")
        else:
            print(f"[WARN] {file_path}: No existe (opcional) - {description}")
    
    return all_ok


def check_python_packages():
    """Verifica que los paquetes Python estén instalados"""
    print("\n" + "="*60)
    print("3. Verificando Paquetes Python")
    print("="*60)
    
    required_packages = {
        'supabase': 'Cliente Supabase',
        'dotenv': 'python-dotenv',
        'google.auth': 'google-auth',
        'google_auth_oauthlib': 'google-auth-oauthlib',
        'googleapiclient': 'google-api-python-client',
    }
    
    all_ok = True
    
    for package, description in required_packages.items():
        try:
            __import__(package.replace('.', '_').replace('-', '_'))
            print(f"[OK] {description}: Instalado")
        except ImportError:
            print(f"[ERROR] {description}: NO instalado - Ejecuta: pip install -r requirements.txt")
            all_ok = False
    
    return all_ok


def check_supabase_connection():
    """Verifica conexión a Supabase"""
    print("\n" + "="*60)
    print("4. Verificando Conexión a Supabase")
    print("="*60)
    
    try:
        from utils.supabase_client import get_supabase_client
        
        client = get_supabase_client()
        
        # Intentar una consulta simple
        response = client.table('categories').select('id').limit(1).execute()
        
        if response.data is not None:
            print("[OK] Conexion a Supabase: OK")
            print(f"[OK] Tabla 'categories' existe")
            return True
        else:
            print("[WARN] Conexion OK pero no se pudo verificar tablas")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error conectando a Supabase: {e}")
        print("   Verifica SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env")
        return False


def check_gmail_credentials():
    """Verifica credenciales de Gmail API"""
    print("\n" + "="*60)
    print("5. Verificando Credenciales Gmail API")
    print("="*60)
    
    credentials_path = os.getenv('GMAIL_CREDENTIALS_PATH', './credentials.json')
    token_path = os.getenv('GMAIL_TOKEN_PATH', './token.json')
    
    if not Path(credentials_path).exists():
        print(f"[WARN] credentials.json no encontrado en: {credentials_path}")
        print("   Configura Gmail API siguiendo docs/GMAIL_API_SETUP.md")
        return False
    
    print(f"[OK] credentials.json encontrado: {credentials_path}")
    
    if Path(token_path).exists():
        print(f"[OK] token.json encontrado: {token_path}")
        print("   Gmail API esta configurado y autenticado")
        return True
    else:
        print(f"[WARN] token.json no encontrado: {token_path}")
        print("   Se generara automaticamente en la primera ejecucion")
        return True  # No es error, se generará después


def check_migrations():
    """Verifica que las migraciones estén ejecutadas"""
    print("\n" + "="*60)
    print("6. Verificando Migraciones SQL")
    print("="*60)
    
    try:
        from utils.supabase_client import get_supabase_client
        
        client = get_supabase_client()
        
        # Verificar tablas principales
        tables = ['transactions', 'categories', 'budgets', 'categorization_rules', 'budget_alerts']
        
        all_exist = True
        for table in tables:
            try:
                response = client.table(table).select('id').limit(1).execute()
                if response.data is not None:
                    print(f"[OK] Tabla '{table}': Existe")
                else:
                    print(f"[WARN] Tabla '{table}': Existe pero vacia")
            except Exception as e:
                print(f"[ERROR] Tabla '{table}': NO existe o error - {e}")
                all_exist = False
        
        # Verificar categorías del sistema
        try:
            response = client.table('categories').select('id', count='exact').eq('is_system', True).execute()
            count = response.count if hasattr(response, 'count') else len(response.data) if response.data else 0
            if count >= 15:
                print(f"[OK] Categorias del sistema: {count} encontradas")
            else:
                print(f"[WARN] Categorias del sistema: Solo {count} encontradas (esperado: 15)")
        except Exception as e:
            print(f"[WARN] No se pudo verificar categorias: {e}")
        
        return all_exist
        
    except Exception as e:
        print(f"[ERROR] Error verificando migraciones: {e}")
        return False


def main():
    """Función principal de validación"""
    print("\n" + "="*60)
    print("WINM - Validación del Ambiente")
    print("="*60)
    
    results = {
        'Variables de Entorno': check_env_variables(),
        'Archivos': check_files(),
        'Paquetes Python': check_python_packages(),
        'Conexión Supabase': check_supabase_connection(),
        'Credenciales Gmail': check_gmail_credentials(),
        'Migraciones SQL': check_migrations(),
    }
    
    print("\n" + "="*60)
    print("RESUMEN")
    print("="*60)
    
    all_ok = True
    for check_name, result in results.items():
        status = "[OK]" if result else "[FALLO]"
        print(f"{status} - {check_name}")
        if not result:
            all_ok = False
    
    print("="*60)
    
    if all_ok:
        print("\n[SUCCESS] Ambiente completamente configurado!")
        print("   Puedes ejecutar: python scripts/main.py")
    else:
        print("\n[WARN] Hay problemas en la configuracion")
        print("   Revisa los errores arriba y consulta la documentacion:")
        print("   - docs/MIGRATION_GUIDE.md")
        print("   - docs/GMAIL_API_SETUP.md")
        print("   - scripts/README.md")
    
    return 0 if all_ok else 1


if __name__ == '__main__':
    sys.exit(main())
