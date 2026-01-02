"""
Script para ejecutar migraciones SQL usando Supabase CLI
WINM - What I Need Most
Principio KISS: Script simple que usa CLI de Supabase
"""

import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Cargar variables de entorno
load_dotenv()

def check_supabase_cli():
    """Verifica que Supabase CLI esté instalada"""
    try:
        result = subprocess.run(
            ['supabase', '--version'],
            capture_output=True,
            text=True,
            check=True
        )
        version = result.stdout.strip()
        print(f"✅ Supabase CLI encontrada: {version}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Supabase CLI no encontrada")
        print("   Instala desde: https://supabase.com/docs/guides/cli")
        return False

def check_project_linked():
    """Verifica que el proyecto esté vinculado"""
    try:
        result = subprocess.run(
            ['supabase', 'status'],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        # Si el proyecto está vinculado, status mostrará información
        # Si no está vinculado, mostrará error
        if result.returncode == 0 or 'project_id' in result.stdout.lower():
            print("✅ Proyecto vinculado")
            return True
        else:
            print("⚠️  Proyecto no vinculado")
            return False
    except Exception as e:
        print(f"⚠️  No se pudo verificar estado: {e}")
        return False

def link_project():
    """Intenta vincular el proyecto"""
    project_ref = os.getenv('SUPABASE_PROJECT_REF', 'ioixblxanqcacqzlijps')
    
    print(f"\n📎 Vinculando proyecto: {project_ref}")
    print("   Necesitarás:")
    print("   1. Access Token de Supabase (https://supabase.com/dashboard/account/tokens)")
    print("   2. Database password (Settings → Database en tu proyecto)")
    
    response = input("\n¿Deseas vincular el proyecto ahora? (s/n): ").strip().lower()
    
    if response != 's':
        print("⚠️  Vinculación cancelada")
        return False
    
    try:
        result = subprocess.run(
            ['supabase', 'link', '--project-ref', project_ref],
            cwd=Path(__file__).parent.parent
        )
        
        if result.returncode == 0:
            print("✅ Proyecto vinculado exitosamente")
            return True
        else:
            print("❌ Error vinculando proyecto")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def run_migrations():
    """Ejecuta migraciones usando Supabase CLI"""
    project_root = Path(__file__).parent.parent
    
    print("\n" + "="*60)
    print("Ejecutando Migraciones con Supabase CLI")
    print("="*60)
    
    try:
        # Ejecutar db push (aplica todas las migraciones pendientes)
        result = subprocess.run(
            ['supabase', 'db', 'push'],
            cwd=project_root,
            capture_output=False,
            text=True
        )
        
        if result.returncode == 0:
            print("\n✅ Migraciones ejecutadas exitosamente")
            return True
        else:
            print("\n❌ Error ejecutando migraciones")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

def list_migrations():
    """Lista migraciones aplicadas"""
    project_root = Path(__file__).parent.parent
    
    try:
        result = subprocess.run(
            ['supabase', 'migration', 'list'],
            cwd=project_root,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("\n📋 Migraciones aplicadas:")
            print(result.stdout)
        else:
            print("⚠️  No se pudo listar migraciones")
    except Exception as e:
        print(f"⚠️  Error listando migraciones: {e}")

def main():
    """Función principal"""
    print("="*60)
    print("WINM - Ejecutor de Migraciones con Supabase CLI")
    print("="*60)
    
    # Verificar CLI
    if not check_supabase_cli():
        sys.exit(1)
    
    # Verificar proyecto vinculado
    if not check_project_linked():
        print("\n⚠️  El proyecto no está vinculado")
        if not link_project():
            print("\n❌ No se puede continuar sin vincular el proyecto")
            print("\nPara vincular manualmente:")
            print("  1. Obtén Access Token: https://supabase.com/dashboard/account/tokens")
            print("  2. Ejecuta: supabase link --project-ref ioixblxanqcacqzlijps")
            sys.exit(1)
    
    # Ejecutar migraciones
    if run_migrations():
        # Listar migraciones aplicadas
        list_migrations()
        
        print("\n" + "="*60)
        print("✅ Proceso completado")
        print("="*60)
        print("\nPróximos pasos:")
        print("  1. Verifica las tablas en Supabase Dashboard")
        print("  2. Ejecuta: python scripts/validate_environment.py")
    else:
        print("\n❌ Error ejecutando migraciones")
        print("\nAlternativa: Ejecuta migraciones manualmente en SQL Editor")
        print("Ver: docs/MIGRATION_GUIDE.md")
        sys.exit(1)

if __name__ == '__main__':
    main()
