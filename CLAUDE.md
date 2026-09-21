# Masi — reglas del proyecto

Marketplace de servicios con pago protegido en un contrato Soroban. Hackathon Stellar Odyssey Perú 2026, track 6 (Open Build). Entrega: **25 de septiembre**.

**Lee `masi-scope.md` antes de cualquier tarea.** Tiene los 9 estados, la tabla de funciones del contrato y el cronograma. No propongas una arquitectura distinta a la que está ahí.

## Arquitectura — no se cambia

Escrow en Soroban + passkeys (contrato de cuenta, dirección C) + relayer que paga el XLM. Todo lo que no sea retener dinero o guardar reseñas vive fuera de la cadena.

Si algo de esto no funciona, el scope ya tiene el fallback definido. No inventes uno nuevo.

## Reglas duras

- **En la interfaz nunca aparecen** las palabras *wallet*, *XLM*, *gas* ni *seed phrase*. Los montos siempre en soles.
- **El dominio es `https://masiapp.vercel.app` y no se cambia.** Se migró de Netlify a Vercel el 21/09, antes de crear ninguna wallet definitiva. Las passkeys quedan atadas al dominio exacto; si se renombra, las cuentas creadas antes dejan de entrar. Probar siempre en la URL principal, nunca en un deploy preview.
- **No depender de eventos del RPC para el historial.** Solo se guardan un tiempo limitado. El historial va en storage persistente, extendiendo el TTL en cada escritura.
- **El adelanto de materiales no se puede disputar** una vez entregado.
- **Cada función de escritura exige `require_auth`** del rol indicado en la tabla.
- **No levantar el Anchor Platform.** Ver "Fuera del alcance" en el scope.
- **Los agentes no se firman como co-autores.** Nada de `Co-Authored-By` ni de líneas de atribución generadas en los commits ni en las descripciones de PR. El commit lo firma la persona.

## Contrato desplegado — úsalo, no lo inventes

Vivo en **testnet** desde el 20 de septiembre:

| | |
| --- | --- |
| Contrato `escrow` | `CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV` |
| SAC de PEN-test | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |
| Red | `Test SDF Network ; September 2015` · RPC `https://soroban-testnet.stellar.org` |

`CAV3YGS5Z5JIOHW7V6OAMLTZLFKR6CHZZJBHNEU3MGHT56FMCYTMELLO` es un despliegue **viejo y superado**; si lo encuentras en algún sitio, está mal.

**Para conectar el frontend al contrato, lee [`INTEGRACION.md`](./INTEGRACION.md).** Los tipos están en `shared/escrow.ts` y son la referencia; el ABI real es el código Rust.

## Direcciones C — el error más fácil de cometer

Los usuarios tienen direcciones de contrato, no direcciones G clásicas. **No necesitan trustline**: el saldo vive en el storage del SAC. La recarga es un `mint` del SAC firmado por la cuenta emisora. La función `trust()` es un no-op para direcciones C.

Si copias un ejemplo de pagos clásicos de Stellar, no va a funcionar. Detalle completo en la sección "PEN-test y direcciones C" del scope.

## Interfaz

**Lee `STYLE_GUIDE.md` antes de crear o modificar cualquier pantalla.** Paleta cerrada (azul marino `#1E3A8A`, azul `#2563EB`, naranja `#F59E0B` solo en acentos, crema `#FEF3C7`, gris `#E5E7EB`), tipografía Montserrat, tuteo, contraste mínimo WCAG AA. No inventes colores ni fuentes fuera de esos tokens.

## Skills y herramientas

- Contratos → `stellar-dev:smart-contracts`
- Frontend, passkeys, relayer → `stellar-dev:dapp` (y su `smart-accounts.md`)
- Activos y SAC → `stellar-dev:assets`
- Datos que cambian (librerías mantenidas, proyectos, docs de hoy) → MCP `stellar-raven`

Instalación en `SETUP_AGENTES.md`.

## Frentes

P1 contrato · P2 cuentas · P3 marketplace · P4 flujo e integración.

**No toques el frente de otro.** El 22 hay un punto de integración crítico; los cambios cruzados sin avisar lo rompen.

## Orden de recorte

Si falta tiempo: disputa y `resolve` → passkeys (pasar al fallback) → comentarios de reseñas → búsqueda → pantalla de recarga.

**Nunca se recortan:** el flujo principal con adelanto para materiales, `auto_release`, `rate` y el perfil con historial on-chain.
