# Reglas de PowerShell

## Terminal Predeterminada
- SIEMPRE usar PowerShell en Windows
- NO usar comandos de bash o Linux
- Usar sintaxis de PowerShell para todos los comandos
- Asumir que el entorno es Windows con PowerShell

## Comandos Comunes de PowerShell

### Output con Colores
```powershell
# Correcto
Write-Host "Mensaje" -ForegroundColor Green
Write-Host "Advertencia" -ForegroundColor Yellow
Write-Host "Error" -ForegroundColor Red
Write-Host "Info" -ForegroundColor Cyan

# Incorrecto
echo "Mensaje"
print("Mensaje")
```

### Listar Archivos
```powershell
# Correcto
Get-ChildItem
Get-ChildItem -Recurse
ls  # Alias aceptable

# Incorrecto
ls -la  # Sintaxis de Linux
find . -name "*.py"
```

### Verificar Existencia de Archivos
```powershell
# Correcto
Test-Path "archivo.txt"
if (Test-Path ".env") { ... }

# Incorrecto
[ -f archivo.txt ]  # Sintaxis de bash
```

### Variables de Entorno
```powershell
# Correcto
$env:SUPABASE_URL
$env:PYTHONPATH = "scripts"

# Incorrecto
$SUPABASE_URL  # Sin $env:
export SUPABASE_URL=...  # Sintaxis de bash
```

### Rutas
```powershell
# Correcto
.\scripts\main.py
..\parent\file.txt
$PWD  # Directorio actual
Join-Path "carpeta" "archivo.txt"

# Incorrecto
./scripts/main.py  # Aunque funciona, preferir backslash
pwd  # Comando de Linux
```

### Ejecutar Scripts Python
```powershell
# Correcto
python scripts\main.py
python -m scripts.main

# Incorrecto
python3 scripts/main.py  # Usar python, no python3
./scripts/main.py  # No funciona en PowerShell sin configuración
```

### Comandos de Supabase CLI
```powershell
# Correcto
supabase db push
supabase migration list
supabase functions deploy send-budget-alert-email

# Estos comandos funcionan igual en PowerShell
```

## Ejemplos de Uso Correcto

### Script de Validación
```powershell
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Validando ambiente" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

if (Test-Path ".env") {
    Write-Host "[OK] Archivo .env encontrado" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Archivo .env no encontrado" -ForegroundColor Red
}

python scripts\validate_environment.py
```

### Verificar Estructura de Carpetas
```powershell
$requiredDirs = @("supabase\migrations", "scripts", "web-app", "docs")
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "[OK] $dir existe" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] $dir no existe" -ForegroundColor Red
    }
}
```

## Notas Importantes
- PowerShell es case-insensitive para comandos (pero respeta case en rutas)
- Usar backticks `` ` `` para continuar líneas
- Usar `|` para pipes (igual que Linux)
- Usar `&&` funciona en PowerShell 7+, pero mejor usar `;` para compatibilidad
