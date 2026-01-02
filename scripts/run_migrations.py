"""
Script para ejecutar migraciones SQL en Supabase
WINM - What I Need Most
Principio KISS: Script simple y directo
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno
load_dotenv()

def get_supabase_client() -> Client:
    """Obtiene cliente de Supabase con service role key para ejecutar migraciones"""
    url = os.getenv('SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        raise ValueError(
            "Variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar en .env"
        )
    
    return create_client(url, service_key)

def read_sql_file(file_path: Path) -> str:
    """Lee archivo SQL y retorna su contenido"""
    if not file_path.exists():
        raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def execute_migration(client: Client, migration_file: Path, migration_name: str):
    """Ejecuta una migración SQL"""
    print(f"\n{'='*60}")
    print(f"Ejecutando: {migration_name}")
    print(f"{'='*60}")
    
    try:
        sql_content = read_sql_file(migration_file)
        
        # Ejecutar SQL usando RPC o directamente
        # Nota: Supabase Python client no tiene método directo para ejecutar SQL arbitrario
        # Necesitamos usar la API REST directamente o ejecutar manualmente en SQL Editor
        
        print(f"✅ Migración {migration_name} leída correctamente")
        print(f"📝 Contenido: {len(sql_content)} caracteres")
        print(f"\n⚠️  NOTA: Esta migración debe ejecutarse manualmente en Supabase SQL Editor")
        print(f"   Archivo: {migration_file}")
        print(f"\n   Copia el contenido y ejecútalo en:")
        print(f"   https://supabase.com/dashboard/project/[TU_PROYECTO]/sql/new")
        
        return True
        
    except Exception as e:
        print(f"❌ Error ejecutando {migration_name}: {e}")
        return False

def main():
    """Función principal"""
    print("="*60)
    print("WINM - Ejecutor de Migraciones SQL")
    print("="*60)
    
    # Obtener ruta del proyecto
    project_root = Path(__file__).parent.parent
    migrations_dir = project_root / 'supabase' / 'migrations'
    
    if not migrations_dir.exists():
        print(f"❌ Directorio de migraciones no encontrado: {migrations_dir}")
        sys.exit(1)
    
    # Lista de migraciones en orden
    migrations = [
        ('001_initial_schema.sql', 'Migración 001: Esquema inicial'),
        ('002_improve_schema_for_sources.sql', 'Migración 002: Mejoras de fuentes'),
        ('003_add_budgets_categories_rules.sql', 'Migración 003: Presupuestos y categorías'),
        ('004_add_auto_categorization_functions.sql', 'Migración 004: Funciones automáticas'),
        ('005_fix_constraints_and_validations.sql', 'Migración 005: Correcciones'),
    ]
    
    print(f"\n📁 Directorio de migraciones: {migrations_dir}")
    print(f"\n📋 Migraciones a ejecutar: {len(migrations)}")
    
    # Verificar conexión
    try:
        client = get_supabase_client()
        print("✅ Conexión a Supabase establecida")
    except Exception as e:
        print(f"❌ Error conectando a Supabase: {e}")
        sys.exit(1)
    
    # Ejecutar cada migración
    results = []
    for filename, description in migrations:
        migration_file = migrations_dir / filename
        success = execute_migration(client, migration_file, description)
        results.append((filename, success))
    
    # Resumen
    print(f"\n{'='*60}")
    print("RESUMEN DE EJECUCIÓN")
    print(f"{'='*60}")
    
    for filename, success in results:
        status = "✅ OK" if success else "❌ ERROR"
        print(f"{status} - {filename}")
    
    print(f"\n{'='*60}")
    print("⚠️  IMPORTANTE:")
    print("Las migraciones deben ejecutarse MANUALMENTE en Supabase SQL Editor")
    print("El script solo valida que los archivos existan y sean legibles")
    print(f"{'='*60}")
    
    # Ejecutar script de prueba si todas las migraciones fueron validadas
    test_file = migrations_dir / 'test_schema.sql'
    if all(success for _, success in results) and test_file.exists():
        print(f"\n📝 Script de prueba disponible: {test_file}")
        print("   Ejecútalo después de ejecutar todas las migraciones")

if __name__ == '__main__':
    main()
