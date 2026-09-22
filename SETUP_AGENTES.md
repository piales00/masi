# Setup para trabajar con agentes de AI — Masi

Guía de instalación para el equipo (P1, P2, P3, P4). Son 4 pasos y toma ~20 minutos, más el tiempo de compilación de Rust.

Hazlo **completo antes de empezar a codear**. Si te saltas el paso 3 o el 4, tu agente va a inventar APIs de Stellar que no existen o que están desactualizadas.

---

## Paso 0 — Herramientas base

> 🪟 **¿Windows?** Instala [WSL2](https://learn.microsoft.com/es-es/windows/wsl/install) y corre **todo** dentro de tu distro (Ubuntu), no en PowerShell. La Stellar CLI y Rust no funcionan confiablemente en Windows nativo.

### Linux / WSL2

```bash
sudo apt update && sudo apt install -y git build-essential pkg-config libssl-dev

# Node.js — usa la LTS más reciente
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install --lts
corepack enable          # habilita pnpm

# Rust (necesita 1.84+)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32v1-none

# Stellar CLI
curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh
```

### macOS

```bash
brew install git node
corepack enable

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32v1-none

curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh
```

### Verificar

```bash
git --version
node --version      # 22 o más — el SDK v16 de Stellar exige Node 22+
pnpm --version
rustc --version     # 1.84.0 o más
stellar version
rustup target list --installed | grep wasm32v1-none
```

Si un comando "no se encuentra" después de instalarlo, cierra y abre la terminal (o `source ~/.bashrc`).

> ⏱️ La instalación de Rust y la Stellar CLI puede tomar 10–15 min según tu conexión. Arranca esto primero y sigue leyendo mientras corre.

---

## Paso 1 — Configurar testnet

```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Tu identidad de desarrollo (cada uno la suya, con tu nombre)
stellar keys generate masi-<tu-nombre> --network testnet
stellar keys fund masi-<tu-nombre> --network testnet
stellar keys address masi-<tu-nombre>
```

Guarda esa dirección: la vas a necesitar para invocar el contrato.

---

## Paso 2 — Clonar el repo de referencia

Guía comunitaria de Stellar Perú. **No es nuestro proyecto** — es material de consulta, clónalo fuera de la carpeta de Masi.

```bash
cd ~/Projects
git clone https://github.com/Gabrululu/Stellar-Build-PE.git
```

Qué hay adentro y para quién:

| Archivo | Útil para |
|---|---|
| `SetUp_Dev.md` | Errores comunes de Soroban, comandos de la CLI |
| `Guia_Claude_Code.md` | Workflows: plan mode, agentes en paralelo, CLAUDE.md |
| `Prompts_Iniciales.md` | Prompts listos para copiar |
| `Recursos.md` | Índice de skills, docs oficiales, herramientas |
| `VotaOnChain/` | **dApp de ejemplo completa** — contrato Soroban en Rust + React + Wallets Kit. P1 y P4: léanla, es el esqueleto más cercano a lo nuestro |
| `Stellar-dev-skill/` | Skill en español con contexto peruano (se instala en el paso 3) |

---

## Paso 3 — Instalar los skills

Los skills le dan a tu agente conocimiento actualizado de Stellar sin que tenga que buscarlo. Instala **los dos**, no uno en lugar del otro.

### 3a. Skill oficial de SDF (obligatorio)

Dentro de una sesión de Claude Code:

```
/plugin marketplace add stellar/stellar-dev-skill
/plugin install stellar-dev@stellar-dev
```

Te da 8 skills: `smart-contracts`, `dapp`, `assets`, `data`, `standards`, `cross-chain`, `agentic-payments`, `zk-proofs`.

**Los que importan para Masi:**
- **P1 (contrato)** → `stellar-dev:smart-contracts` — storage, TTL, `require_auth`, tests, deploy
- **P2 (cuentas)** → `stellar-dev:dapp`, y dentro de él el archivo `smart-accounts.md` (passkeys + relayer de OpenZeppelin)
- **P3 y P4 (frontend)** → `stellar-dev:dapp` — stellar-sdk, invocar contratos, Wallets Kit
- **Quien vea la rampa** → `stellar-dev:assets` y `stellar-dev:standards`

### 3b. Skill peruano (complemento)

```bash
cp -r ~/Projects/Stellar-Build-PE/Stellar-dev-skill/skill ~/.claude/skills/stellar-dev-pe/
```

Se instala como `stellar-dev-pe` para no chocar con el oficial. Aporta contexto de Yape, Plin, CCI, anchors LATAM y un archivo de `common-pitfalls.md` en español.

> Otros agentes: OpenCode usa `~/.config/opencode/skill/`, Codex usa `~/.codex/skills/`.

### Verificar

```
/plugin list
```

Debe aparecer `stellar-dev`. Y al escribir `/` deben salir los `stellar-dev:*` en la lista.

---

## Paso 4 — Conectar el MCP de Raven

Raven es un servidor remoto que le da a tu agente búsqueda **en vivo** sobre docs de Stellar y datos del ecosistema. Los skills son conocimiento fijo; Raven es para lo que cambia (qué librerías están mantenidas, qué proyectos existen, qué dice la doc hoy).

```bash
# Desde la carpeta del proyecto Masi
cd ~/Projects/masi
claude mcp add --transport http -s project stellar-raven https://raven.stellar.buzz/mcp
```

Después, **dentro de la sesión de Claude Code**:

```
/mcp
```

→ elige `stellar-raven` → `Authenticate` → se abre el navegador → inicia sesión (OAuth vía WorkOS) → vuelve a la terminal.

Debe decir `Authentication successful. Connected to stellar-raven.`

**Por qué `-s project`:** guarda la configuración en un `.mcp.json` dentro del repo, así queda versionado y los demás lo reciben con un `git pull` sin volver a correr el comando. Cada uno **sí** tiene que autenticarse por su cuenta con `/mcp`.

> ⚠️ El MCP se registra **por carpeta**. Si abres Claude Code en otro directorio, Raven no va a estar ahí.

**Probarlo sin instalar nada:** [raven.stellar.buzz/playground](https://raven.stellar.buzz/playground)

---

## Verificación final

Abre Claude Code en `~/Projects/masi` y pídele:

```
Usa el MCP de Raven para buscar cómo se hace fee sponsorship en Stellar,
y luego lee el skill stellar-dev:smart-contracts.
```

Si responde con fuentes y links reales, estás listo. Si dice que no tiene esas herramientas, revisa el paso 3 o el 4.

---

## Cómo trabajar con el agente en este proyecto

**Antes de cualquier tarea, dale el scope.** El documento `masi-scope.md` tiene los 9 estados, la tabla de funciones del contrato y el cronograma. Sin eso, el agente va a proponer una arquitectura distinta a la que acordamos.

```
Lee masi-scope.md antes de empezar. No cambies la arquitectura
(escrow Soroban + passkeys + relayer), solo implementa lo que dice.
```

**Usa plan mode para lo grande.** Antes de que escriba código, pídele el plan y revísalo. Es más barato corregir un plan que 300 líneas de Rust.

**No dejes que "mejore" cosas fuera de tu frente.** Si eres P3 y el agente quiere tocar el contrato, frénalo. El 22 hay un punto de integración crítico y no queremos sorpresas.

### Prompts de arranque por frente

**P1 — Contrato**
```
Lee masi-scope.md, la tabla de funciones del contrato escrow.
Usa el skill stellar-dev:smart-contracts.
Implementa create_job, accept, fund y start con sus tests unitarios.
Storage persistente con extensión de TTL en cada escritura.
```

**P2 — Cuentas**
```
Lee masi-scope.md, la sección "Passkeys y relayer".
Lee el archivo smart-accounts.md del skill stellar-dev:dapp.
Usa Raven para verificar cuál de passkey-kit o smart-account-kit está
mantenida hoy y cuál tiene ejemplo funcionando en testnet.
```

**P3 — Marketplace**
```
Lee masi-scope.md, la sección "Frontend y marketplace".
Arma el JSON de 8 proveedores y las pantallas de búsqueda y perfil
con datos falsos. Nada de conexión a la cadena todavía.
```

**P4 — Flujo**
```
Lee masi-scope.md, las secciones "Flujo del cliente" y los 9 estados.
Usa el skill stellar-dev:dapp.
Arma las pantallas de cliente y proveedor con datos falsos,
listas para conectarse al contrato el 21.
```

---

## Reglas del proyecto que el agente debe respetar

Estas ya están en el scope, pero repítelas cuando el agente se desvíe:

- **En la interfaz nunca aparecen** las palabras *wallet*, *XLM*, *gas* ni *seed phrase*. Todo en soles.
- **El dominio `masiapp.vercel.app` no se cambia.** Las huellas quedan amarradas a la dirección exacta del sitio; si se renombra, todas las cuentas creadas antes dejan de entrar.
- **Prueba siempre en la URL principal**, nunca en un deploy preview (`deploy-preview-4--...`) — es otra dirección y las huellas de ahí no sirven en producción.
- **No dependas de los eventos del RPC para el historial.** Solo se guardan un tiempo limitado; el historial va en storage persistente.
- El adelanto de materiales **no se puede disputar** una vez entregado.

---

## Si algo se rompe

| Síntoma | Qué hacer |
|---|---|
| `stellar: command not found` | Cierra y abre la terminal, o `source ~/.bashrc` |
| Error de target al compilar el contrato | `rustup target add wasm32v1-none` |
| El agente no ve los `stellar-dev:*` | Reinstala el plugin (paso 3a) y reinicia Claude Code |
| Raven no aparece | Estás en otra carpeta. Vuelve a `~/Projects/masi` |
| Raven pide autenticar otra vez | Normal, el token expira. `/mcp` → Authenticate |
| El agente inventa APIs de Stellar | No instalaste los skills. Paso 3 |

Dudas del ecosistema: [grupo de WhatsApp de Stellar Perú](https://chat.whatsapp.com/Hu4Fn4rfpZzDsqyMoeFRvJ).
