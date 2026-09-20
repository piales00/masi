<#
Activa las herramientas portables solo en la consola actual.
Uso desde la raiz: . .\scripts\enter-dev.ps1
Si Windows bloquea scripts, habilita solo esta consola primero:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.tools'
$nodeBin = Join-Path $toolsRoot 'node-v24.21.0-win-x64'
$cargoBin = Join-Path $toolsRoot 'cargo\bin'
$stellarBin = Join-Path $toolsRoot 'stellar'
foreach ($executable in @((Join-Path $nodeBin 'node.exe'), (Join-Path $cargoBin 'cargo.exe'), (Join-Path $stellarBin 'stellar.exe'))) {
    if (-not (Test-Path -LiteralPath $executable)) {
        throw 'Faltan herramientas portables. Ejecuta primero .\scripts\setup-dev.ps1'
    }
}
$env:CARGO_HOME = Join-Path $toolsRoot 'cargo'
$env:RUSTUP_HOME = Join-Path $toolsRoot 'rustup'
$env:npm_config_cache = Join-Path $toolsRoot 'npm-cache'
# Conserva el resto de PATH y evita duplicar las entradas al activar nuevamente.
$localBins = @($nodeBin, $cargoBin, $stellarBin)
$remainingPath = $env:PATH -split ';' | Where-Object { $_ -and $_ -notin $localBins }
$env:PATH = ($localBins + $remainingPath) -join ';'
