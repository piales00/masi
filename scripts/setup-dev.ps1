<#
Instala herramientas portables verificadas exclusivamente en .tools.
Uso (PowerShell en Windows x64):
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-dev.ps1
No modifica PATH global, registro, servicios ni cuentas Stellar.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
if (-not [Environment]::Is64BitOperatingSystem -or $env:OS -ne 'Windows_NT') {
    throw 'Este setup portable requiere Windows x64.'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.tools'
$downloadsRoot = Join-Path $toolsRoot 'downloads'
New-Item -ItemType Directory -Force -Path $downloadsRoot | Out-Null

function Get-VerifiedDownload {
    param([string]$Url, [string]$FileName, [string]$Sha256)
    $destination = Join-Path $downloadsRoot $FileName
    if (-not (Test-Path -LiteralPath $destination)) {
        Write-Host "Descargando $FileName..."
        Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $destination
    }
    $actualHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
    if ($actualHash -ne $Sha256) {
        throw "SHA-256 incorrecto: $destination. Elimina ese archivo y vuelve a ejecutar el setup."
    }
    return $destination
}

# SHA-256 publicado en https://nodejs.org/dist/v24.21.0/SHASUMS256.txt
$nodeArchive = Get-VerifiedDownload `
    -Url 'https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip' `
    -FileName 'node-v24.21.0-win-x64.zip' `
    -Sha256 '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541'
if (-not (Test-Path -LiteralPath (Join-Path $toolsRoot 'node-v24.21.0-win-x64\node.exe'))) {
    Expand-Archive -LiteralPath $nodeArchive -DestinationPath $toolsRoot
}

# SHA-256 publicado por Rust en la misma URL con sufijo .sha256.
$rustupInstaller = Get-VerifiedDownload `
    -Url 'https://static.rust-lang.org/rustup/archive/1.29.1/x86_64-pc-windows-gnu/rustup-init.exe' `
    -FileName 'rustup-init.exe' `
    -Sha256 '6d5b5709addc0122c916d8c810da8d8a7b086a5d64fa805ef404d506392aadc8'
$env:CARGO_HOME = Join-Path $toolsRoot 'cargo'
$env:RUSTUP_HOME = Join-Path $toolsRoot 'rustup'
$rustupExecutable = Join-Path $env:CARGO_HOME 'bin\rustup.exe'
if (-not (Test-Path -LiteralPath $rustupExecutable)) {
    & $rustupInstaller -y --no-modify-path --default-host x86_64-pc-windows-gnu --profile minimal --default-toolchain none
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo instalar Rustup portable.' }
}
# Rustup verifica los checksums de todos los componentes contra el manifiesto oficial.
# El host GNU incluye el linker necesario para las dependencias Rust del contrato.
& $rustupExecutable toolchain install 1.98.1-x86_64-pc-windows-gnu --profile minimal --target wasm32v1-none --component rustfmt,clippy --no-self-update
if ($LASTEXITCODE -ne 0) { throw 'No se pudo instalar el toolchain Rust.' }
& $rustupExecutable default 1.98.1-x86_64-pc-windows-gnu
if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar el toolchain local.' }

# SHA-256 (digest) publicado en la release oficial stellar/stellar-cli v28.0.0.
$stellarArchive = Get-VerifiedDownload `
    -Url 'https://github.com/stellar/stellar-cli/releases/download/v28.0.0/stellar-cli-28.0.0-x86_64-pc-windows-msvc.tar.gz' `
    -FileName 'stellar-cli-28.0.0-x86_64-pc-windows-msvc.tar.gz' `
    -Sha256 'eae2a3acece0ba96cecafc22c3f1c62d2ce71c1c8ad7f3787401ab44b8f7d424'
$stellarRoot = Join-Path $toolsRoot 'stellar'
if (-not (Test-Path -LiteralPath (Join-Path $stellarRoot 'stellar.exe'))) {
    New-Item -ItemType Directory -Force -Path $stellarRoot | Out-Null
    & tar -xzf $stellarArchive -C $stellarRoot
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo extraer Stellar CLI.' }
}

. (Join-Path $PSScriptRoot 'enter-dev.ps1')
& node.exe --version
& cargo.exe --version
& stellar.exe --version
Write-Host 'Listo. Para activar en otra consola: Set-ExecutionPolicy -Scope Process Bypass; . .\scripts\enter-dev.ps1'
