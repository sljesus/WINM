"""
Script para corregir problemas de encoding en .env
WINM - What I Need Most
"""

import os
import sys
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def fix_env_file():
    """Corrige el archivo .env eliminando BOM y caracteres especiales"""
    project_root = Path(__file__).parent.parent
    env_file = project_root / '.env'
    
    if not env_file.exists():
        print("[ERROR] Archivo .env no encontrado")
        return False
    
    print("[INFO] Corrigiendo archivo .env...")
    
    try:
        # Leer archivo con diferentes encodings
        content = None
        for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                with open(env_file, 'r', encoding=encoding) as f:
                    content = f.read()
                print(f"✅ Archivo leído con encoding: {encoding}")
                break
            except Exception as e:
                continue
        
        if content is None:
            print("[ERROR] No se pudo leer el archivo .env")
            return False
        
        # Eliminar BOM si existe
        if content.startswith('\ufeff'):
            content = content[1:]
            print("[OK] BOM eliminado")
        
        # Limpiar líneas: eliminar caracteres especiales al inicio de nombres de variables
        lines = []
        for line in content.split('\n'):
            # Eliminar caracteres especiales al inicio de la línea (como '»', BOM, etc.)
            cleaned_line = line.lstrip('\ufeff»«\u200b\uFEFF')
            # Eliminar espacios al inicio también
            cleaned_line = cleaned_line.lstrip()
            # Solo agregar si no está vacía y no es solo espacios/comentarios válidos
            if cleaned_line.strip() and not cleaned_line.strip().startswith('#'):
                # Verificar que la línea tenga formato válido (VARIABLE=valor)
                if '=' in cleaned_line:
                    lines.append(cleaned_line)
            elif cleaned_line.strip().startswith('#'):
                # Mantener comentarios
                lines.append(cleaned_line)
        
        # Escribir archivo limpio con UTF-8 sin BOM
        with open(env_file, 'w', encoding='utf-8', newline='\n') as f:
            f.write('\n'.join(lines))
            if lines:  # Agregar nueva línea al final si hay contenido
                f.write('\n')
        
        print("[OK] Archivo .env corregido y guardado")
        print(f"[INFO] {len(lines)} lineas procesadas")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

if __name__ == '__main__':
    print("="*60)
    print("WINM - Corrector de Encoding .env")
    print("="*60)
    
    if fix_env_file():
        print("\n[OK] Proceso completado")
        print("\nAhora puedes ejecutar:")
        print("  supabase link --project-ref ioixblxanqcacqzlijps")
    else:
        print("\n[ERROR] No se pudo corregir el archivo")
        print("\nAlternativa: Crea un nuevo archivo .env con este contenido:")
        print("\nSUPABASE_URL=https://ioixblxanqcacqzlijps.supabase.co")
        print("SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key")
        print("SUPABASE_ANON_KEY=tu_anon_key")
        print("SUPABASE_PROJECT_REF=ioixblxanqcacqzlijps")
