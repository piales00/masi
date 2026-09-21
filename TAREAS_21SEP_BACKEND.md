# Tareas del 21 de septiembre — Backend

**Resumen.** Hoy te toca todo lo que no se ve: `dispute` y `resolve` en el contrato con su redespliegue, la API del almacén compartido (solicitudes, postulaciones, cotizaciones y reseñas) y la Function del relayer. Tu primera entrega es **la definición de la API de la [sección 2](#2-la-api-del-almacén--el-punto-de-integración)**, versionada en `shared/api.ts`, porque el frontend trabaja contra ella en paralelo. Tres decisiones abiertas condicionan parte del trabajo, y están marcadas con 🔒 en cada tarea. Checkpoint el 23 y entrega el 25.

Documento hermano: [`TAREAS_21SEP_FRONTEND.md`](./TAREAS_21SEP_FRONTEND.md).


> **✅ Decisión (a) cerrada el 21 al mediodía: Vercel.** El dominio congelado es **`https://masiapp.vercel.app`**; ya no se usa `masiapp.netlify.app` para nada. B7 está hecha: el proyecto ya existe en Vercel. **B4b, B5b y B6 quedan desbloqueadas** y se implementan sobre Vercel Functions + Vercel Blob. B6: las wallets de María y Juan se crean en `https://masiapp.vercel.app/passkey-test/`, nunca en una URL de preview (`masiapp-git-…`).

> **✅ Decisiones del PO cerradas (21/09, tarde):** (b) se construye la disputa — **B2 y B3 ya están hechas y desplegadas** (PR #6), no las repitas; el contract ID definitivo es **`CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL`**. `resolve` **cuenta como trabajo completado** y como disputa. (c) plazo de revisión por defecto **24 h** (`review_secs = 86400`). Datos **compartidos** con la API. Siguen abiertas, y mientras tanto se usa la recomendación: tras publicar se va al detalle de la solicitud, botón "Tengo un problema" en la pantalla de trabajo, comentario de reseña opcional, y API sin autenticación declarada en el README.

---

## 0. Antes de empezar

### Decisiones abiertas que bloquean tareas

| # | Decisión | Recomendación | Bloquea |
|---|---|---|---|
| **(a)** | **Hosting**: pagar Netlify Personal (9 USD, se queda `masiapp.netlify.app`) o mudarse hoy a Vercel Hobby (gratis, cambia el dominio) | La tiene que tomar el PO **antes de crear las wallets de María y Juan** | B4b, B5b, B6, B7 |
| **(b)** | **¿Se construye `dispute`/`resolve`?** | Sí, hoy (~3 h con tests) | B2, B3 |
| **(c)** | **Plazo de revisión por defecto** | ✅ Decidido: **24 h** (`86400` s) | Solo el valor de `reviewSecs` en la API |

Por qué (a) es urgente: Netlify está sin créditos. El plan gratuito da 300 al mes, cada despliegue de producción cuesta 15 y quedan 30, o sea **dos despliegues**, sin renovación hasta el 19 de octubre. El tráfico y las invocaciones de Functions también gastan créditos, así que el sitio se puede pausar solo en pleno vídeo. **Cambiar de dominio solo es barato hoy**: las passkeys se atan al dominio y las wallets definitivas todavía no existen. Si se mudan, la mudanza va **antes** de B6.

### Git: cómo trabajar sin quemar despliegues

- `main` está protegido por un ruleset: no se empuja directo, todo entra por PR (no exige aprobaciones).
- **Cada merge a `main` es un despliegue de producción.** En Netlify quedan dos.
- Trabaja en ramas cortas (`feat/dispute`, `feat/api-almacen`, `feat/relayer`) y ábrelas como PR contra **`develop`**. `develop` → `main` se mergea **agrupado**, una vez al día como mucho, cuando algo tenga que verse en el dominio.
- Comprueba en el panel de Netlify que `develop` no tenga *branch deploys* activos. Si los tiene, también gastan créditos.
- Los commits y los PR no llevan `Co-Authored-By` ni líneas de atribución (regla de `CLAUDE.md`).

### Orden del día

```
B1 shared/api.ts ──► (frontend arranca contra los tipos)
B2 dispute/resolve 🔒b ──► B3 redespliegue 🔒b
B4a núcleo de la API ──► B4b adaptador + despliegue 🔒a
B5a relayer (núcleo) ──► B5b relayer desplegado 🔒a ──► B6 wallets de María y Juan 🔒a
B7 mudanza a Vercel 🔒a (solo si se decide)
```

Si hay que recortar, en este orden: B7 se hace solo si se decide; B2 y B3 si el PO dice que no; B5 y B6 pasan al fallback de passkeys (el 22 por la noche). **B1 y B4 no se recortan**: sin almacén compartido, el vídeo sale con los dos roles en un mismo teléfono.

---

## 1. Tareas

### B1 · Publicar la definición de la API en `shared/api.ts`

**Objetivo.** Dejar en el repo los tipos de la [sección 2](#2-la-api-del-almacén--el-punto-de-integración), para que el frontend los importe en lugar de copiarlos.

**Por qué importa.** Es el punto de encuentro de los dos. Si cada uno escribe su versión de `Cotizacion`, el día 22 no encajan.

**Archivos.**
- Nuevo: `shared/api.ts` (copia literal del bloque TypeScript de la sección 2.2).
- `frontend/tsconfig.json`: añadir `"../shared/api.ts"` a `include`. Hoy solo incluye `../shared/escrow.ts` de forma explícita, y sin eso `tsc --noEmit` no lo verifica.

**Criterios de aceptación.**
- [ ] `shared/api.ts` exporta `Solicitud`, `SolicitudInput`, `Postulacion`, `PostulacionInput`, `Cotizacion`, `CotizacionInput`, `Resena`, `ResenaInput`, `ApiError` y las constantes `FEE_BPS`, `MAX_MATERIALS_BPS` y `DEFAULT_REVIEW_SECS`.
- [ ] `cd frontend && npm run build` pasa.
- [ ] PR a `develop` mergeado **antes de las 11:00**, y aviso al frontend.
- [ ] Cualquier cambio posterior a la forma del JSON se hace en `shared/api.ts` **y** en la sección 2 de este documento en el mismo PR, avisando al frontend.

**Depende de.** Nada. **Estimación:** 0,5 h.

---

### B2 · `dispute` y `resolve` en el contrato 🔒 decisión (b)

> **Pendiente de confirmar por el PO.** Si dice que no, salta a B4. **Redesplegar cambia el contract ID** (el contrato no tiene función de actualización), así que B2 y B3 tienen que estar hechas **antes de que el frontend se conecte al contrato y antes de sembrar el historial el 24**. Si se hace después, ese trabajo se pierde.

**Objetivo.** Que el cliente pueda congelar el saldo de un trabajo iniciado o terminado, y que el árbitro lo reparta.

**Por qué importa.** Sin `dispute`, `auto_release` le paga al técnico aunque el cliente no apruebe, y el cliente no tiene cómo frenarlo (M12 del flujo del PO). Es lo primero que preguntaría un jurado.

**Archivos.**
- `contracts/escrow/src/lib.rs`: reemplazar los stubs de `dispute` (línea 281) y `resolve` (línea 288).
- `contracts/escrow/src/events.rs`: nuevos eventos `Disputed` y `Resolved`.
- `contracts/escrow/src/test.rs`: reemplazar `stubs_are_in_abi_and_never_report_success_or_move_funds` (línea 354) y ampliar `all_seven_events_have_stable_topics_and_payloads` (línea 318) con los dos eventos nuevos.
- `contracts/escrow/test_snapshots/`: regenerar y commitear.

**Qué tiene que hacer** (ABI sin cambios: los nombres y argumentos ya están en `shared/escrow.ts`):

- `dispute(job_id, caller)`: `require_party` (ya exige la firma de `caller` y que sea cliente o proveedor). Estado `Started` o `Submitted`; cualquier otro → `InvalidState` (#4). Pasa a `Disputed` y emite `Disputed { job_id, caller }`. **No mueve dinero.** Como `approve` y `auto_release` exigen `Submitted`, quedan bloqueadas sin tocar nada más.
- `resolve(job_id, provider_bps)`: firma del árbitro (`config.arbiter.require_auth()`, ya está). `provider_bps > 10_000` → `InvalidBps` (#7). Estado `Disputed`, si no `InvalidState`. Reparte **solo `remaining_amount`**: al proveedor `portion(remaining, provider_bps)`, y al cliente el resto (así el redondeo no pierde dinero). `fee_amount` va a `config.platform`. El adelanto de materiales ya entregado **nunca** entra en el reparto. Pasa a `Resolved`, fija `released_at` y `remaining_amount = 0`, guarda **antes** de transferir (igual que `release`) y emite `Resolved { job_id, provider_bps, provider_amount, client_amount, fee_amount }`.
- Perfil: `resolve` suma 1 a `disputes` **y también 1 a `completed_jobs`**. Motivo: `rate` se permite desde `Resolved`, y `parseRatingSummary` de `frontend/src/marketplace.ts` (línea 38) rechaza cualquier resumen con `rating_count > completed_jobs`. Si `resolve` no sumara a `completed_jobs`, calificar un trabajo resuelto rompería el perfil del técnico en la pantalla.
- No hacen falta errores nuevos. Si añades alguno, va al final (#17 en adelante): los códigos no se renumeran.

**Criterios de aceptación.**
- [ ] `dispute` funciona desde `Started` y desde `Submitted`, lo pueden llamar tanto el cliente como el proveedor, y un tercero recibe `Unauthorized`.
- [ ] `dispute` desde `Requested`, `Accepted`, `Funded`, `Released`, `Resolved`, `Cancelled` y `Disputed` da `InvalidState`.
- [ ] Tras `dispute`, `approve` y `auto_release` (aunque el plazo haya vencido) dan `InvalidState`.
- [ ] `resolve` sin la firma del árbitro falla; con `provider_bps = 10_001` da `InvalidBps`.
- [ ] Con `provider_bps` de 0, 5.000 y 10.000 los saldos finales cuadran al stroop: proveedor = materiales + su parte, cliente = el resto, plataforma = comisión, **contrato = 0**.
- [ ] Un segundo `resolve` da `InvalidState`.
- [ ] `rate` funciona después de `resolve`, y `rating_of` cumple `rating_count <= completed_jobs` y `disputes == 1`.
- [ ] Test de eventos con `Disputed` y `Resolved` y payload exacto.
- [ ] `cargo fmt --all -- --check`, `cargo test --workspace --locked` y `stellar contract build --locked` pasan. Anota el número nuevo de tests (hoy son 17).

**Depende de.** Decisión (b). **Estimación:** 3 h.

---

### B3 · Redesplegar el contrato y propagar el ID nuevo 🔒 decisión (b)

**Objetivo.** Tener el `escrow` con disputa vivo en testnet y un solo contract ID correcto en todo el repo.

**Por qué importa.** Es el ID que se entrega en el checkpoint del 23 y al que se conecta el frontend el 22.

**Pasos** (reproducción completa en [`DESPLIEGUE.md`](./DESPLIEGUE.md)):
1. Construir, subir el WASM y desplegar con `--admin` de la cuenta `masi`.
2. `init(arbiter = masi, platform = masi-platform, token = CBRGYUR2…ISPSCC)`. **El SAC de PEN-test no cambia.**
3. Ejecutar por CLI un flujo corto: `create_job` → `accept` → `fund` → `start` → `dispute` → `resolve(5000)`, y verificar los saldos del SAC.

**Archivos que cambian.** `CLAUDE.md` (tabla "Contrato desplegado"), `INTEGRACION.md` (tabla inicial y la constante `CONTRACT_ID` del ejemplo), `DESPLIEGUE.md` (identificadores, hash del WASM y hashes de transacción; mover el ID actual `CDBZRR356…3XV` a "despliegues superados", junto a `CAV3YGS5…`), `README.MD`, `AVANCE.md` y la constante `CONTRACT_ID` de `frontend/src/config.ts` (la crea el frontend en su tarea F1).

Aprovecha para corregir `P2_PRUEBA_PASSKEYS.md`, línea 238: todavía apunta al despliegue viejo `CAV3YGS5…`.

**Criterios de aceptación.**
- [ ] `grep -rn "CDBZRR356\|CAV3YGS5"` fuera de `DESPLIEGUE.md` no devuelve nada, salvo menciones explícitas de "superado".
- [ ] `DESPLIEGUE.md` tiene el ID nuevo, el hash del WASM y los hashes de `dispute` y `resolve` verificables en stellar.expert.
- [ ] En `INTEGRACION.md`, las líneas de ejemplo de `rating_of(juan)` y `jobs_of(juan)` se actualizan o se marcan como del contrato anterior: el nuevo empieza vacío.
- [ ] En la tabla de errores de `INTEGRACION.md`, `NotImplemented` ya no se describe como "función aún no construida".
- [ ] Aviso al frontend con el ID nuevo.

**Depende de.** B2. **Tiene que ir antes de** F8 (conectar el frontend) y de la siembra del 24. **Estimación:** 1 h.

---

### B4a · Núcleo de la API del almacén, independiente del proveedor

**Objetivo.** Implementar los endpoints de la [sección 2](#2-la-api-del-almacén--el-punto-de-integración) sobre una interfaz de almacenamiento propia, sin depender todavía de Netlify ni de Vercel.

**Por qué importa.** Hoy las solicitudes y postulaciones viven en el `localStorage` (`frontend/src/demo/DemoContext.tsx`, claves `masi.demo.solicitudes.v1` y `masi.demo.postulaciones.v1`), así que lo que publica María en su teléfono nunca le llega a Juan. Sin esto, el vídeo se graba con los dos roles en el mismo navegador.

**Archivos.**
- Nuevo: `frontend/server/store.ts`, con la interfaz `KeyValueStore { get(key): Promise<unknown | null>; set(key, value): Promise<void>; list(prefix): Promise<string[]> }` y una implementación en memoria para los tests.
- Nuevo: `frontend/server/api.ts`, con `handleApi(req: Request, store: KeyValueStore): Promise<Response>`: enrutado, validación, transiciones de estado y errores.
- Nuevo: `frontend/server/api.test.ts` (Vitest, ya instalado).
- Va dentro de `frontend/` porque ahí está el `package.json` que usan tanto el build de Netlify (`base = "frontend"`) como el de Vercel.

**Criterios de aceptación.**
- [ ] Todos los endpoints de la sección 2.3 responden con los códigos y las formas exactas de la sección 2.
- [ ] El servidor genera `id`, `creadaEn` y `actualizadaEn`, y nunca los acepta del cliente.
- [ ] Las transiciones de la sección 2.4 se aplican en el servidor. Una transición inválida devuelve `409 CONFLICT`.
- [ ] `materialsBps` se **recalcula** en el servidor a partir de `totalStroops` y `materialesStroops`. Si no coincide con el enviado, `400 INVALID`.
- [ ] `PUT /api/resenas/:jobId` recalcula el SHA-256 de `texto`. Si no coincide con `hash`, `400 INVALID`.
- [ ] Tests del núcleo con el almacén en memoria: flujo feliz completo, cada `409` de la tabla de transiciones y cada validación.
- [ ] Ningún campo numérico de dinero viaja como `number`: todos son strings decimales de stroops.

**Depende de.** B1. **Estimación:** 2,5 h.

---

### B4b · Adaptador de almacenamiento y despliegue de la API 🔒 decisión (a)

**Objetivo.** Conectar `handleApi` al Blob storage del proveedor elegido y dejarlo respondiendo en el dominio.

**Archivos, según el proveedor** (detalle en la [sección 2.6](#26-implementación-por-proveedor)):
- Netlify: `frontend/netlify/functions/api.mts` con `config = { path: "/api/*" }`, más `@netlify/blobs`. Declara `[functions] directory = "netlify/functions"` en `netlify.toml`: es relativo a `base = "frontend"`.
- Vercel: `frontend/api/[...ruta].ts`, más `@vercel/blob` con un store **privado** conectado al proyecto.

**Criterios de aceptación.**
- [ ] `GET /api/salud` responde `{"ok":true}` en el dominio y **no** devuelve el `index.html` de la regla SPA (`frontend/public/_redirects` en Netlify, `vercel.json` en Vercel).
- [ ] Publicar una solicitud desde un teléfono y leerla desde otro dispositivo en menos de 5 s. Esto exige lectura consistente: `consistency: "strong"` en Netlify o `useCache: false` en Vercel.
- [ ] Ningún secreto en el repo ni en variables `VITE_`.
- [ ] Documentado en `DESPLIEGUE.md`: dónde vive el store, cómo se vacía antes de grabar el vídeo y qué variables de entorno hay.

**Depende de.** B4a y la decisión (a). **Estimación:** 1 h.

---

### B5a · Relayer: Function que envía las transacciones firmadas

**Objetivo.** Un endpoint `POST /api/relayer` que reciba una transacción ya firmada con la passkey y la envíe por el relayer de OpenZeppelin, que paga la comisión.

**Por qué importa.** Sin relayer no hay ninguna firma con huella que llegue a la red: ni la creación de las wallets (B6) ni pagar, iniciar, terminar, aprobar o calificar en el vídeo. Es el paso 2 de [`TAREA_PASSKEYS_DOMINIO.md`](./TAREA_PASSKEYS_DOMINIO.md), y el contexto está en [`P2_PASSKEYS.md`](./P2_PASSKEYS.md) (sección "Relayer: operativo").

**Archivos.**
- Nuevo: `frontend/server/relayer.ts`, con `handleRelayer(req: Request, env): Promise<Response>`, que usa `PasskeyServer` de **`passkey-kit/server`**.
- `frontend/package.json`: `passkey-kit` (0.19.x, el de `stellar/passkey-kit`, **no** el archivado `kalepail/passkey-kit`).
- Nuevo: `frontend/server/relayer.test.ts`.

**Reglas que no se negocian.**
- La clave del relayer vive **solo** en variables de entorno del servidor: `RELAYER_API_KEY` y `RELAYER_BASE_URL=https://channels.openzeppelin.com/testnet`. **Nunca** en el bundle, **nunca** en una variable `VITE_`, **nunca** en el repo. `passkey-kit/server` no se importa desde nada que esté en `frontend/src/`.
- **Lista blanca**, que es una comprobación nuestra y no del servicio: decodifica la transacción (`TransactionBuilder.fromXDR(xdr, networkPassphrase)`) y acepta solo operaciones `invokeHostFunction` que (1) invoquen el contrato `escrow` o el SAC de PEN-test, o (2) desplieguen una wallet con `walletWasmHash = 97ce0478…a764e`. Esta segunda la necesita `kit.createWallet`. Confirma su forma exacta con la transacción que produce el kit antes de cerrar la regla. Todo lo demás → `403 NOT_ALLOWED`.
- Los IDs permitidos salen de variables de entorno (`ESCROW_CONTRACT_ID`, `PEN_SAC_ID`, `WALLET_WASM_HASH`), para que B3 solo cambie una variable y no el código.
- `PasskeyServer.send` **no lanza excepción** en los fallos esperados: hay que ramificar en `result.success`. El relayer exige `timeoutInSeconds <= 30`.

**Contrato del endpoint** (el frontend lo consume desde F8):

```
POST /api/relayer
Content-Type: application/json
{ "xdr": "<transacción firmada, base64>" }

200 { "hash": "<hash de la transacción>" }
400 { "error": { "code": "INVALID",     "message": "..." } }   // xdr ausente o ilegible
403 { "error": { "code": "NOT_ALLOWED", "message": "..." } }   // fuera de la lista blanca
502 { "error": { "code": "RELAYER",     "message": "..." } }   // result.success === false; message = result.error
```

**Criterios de aceptación.**
- [ ] Tests: una transacción a otro contrato da `403`; una sin `xdr` da `400`; la lista blanca acepta `escrow`, el SAC y el despliegue de wallet.
- [ ] `grep -rn "RELAYER_API_KEY" frontend/src frontend/dist` no devuelve nada después de `npm run build`.
- [ ] `.env` y `.env.local` siguen en `.gitignore` (ya están).

**Depende de.** Nada para el núcleo. **Estimación:** 1,5 h.

### B5b · Relayer desplegado 🔒 decisión (a)

**Objetivo.** `handleRelayer` publicado como Function en el dominio definitivo.

**Archivos.** Netlify: `frontend/netlify/functions/relayer.mts` con `config = { path: "/api/relayer" }`. Vercel: `frontend/api/relayer.ts`. Variables de entorno en el panel del proveedor.

**Criterios de aceptación.**
- [ ] Una transacción firmada con el autenticador virtual de Chrome DevTools en el dominio se envía y aparece en stellar.expert, **sin XLM en la cuenta del usuario**. Cómo activar el autenticador virtual: [`P2_PRUEBA_PASSKEYS.md`](./P2_PRUEBA_PASSKEYS.md), sección de escritorio. En Linux no hay autenticador de plataforma.
- [ ] `POST /api/relayer` no queda tapado por la regla SPA.

**Depende de.** B5a y la decisión (a). **Estimación:** 0,5 h.

---

### B6 · Wallets definitivas de María y Juan 🔒 decisión (a)

**Objetivo y pasos:** están completos en [`TAREA_PASSKEYS_DOMINIO.md`](./TAREA_PASSKEYS_DOMINIO.md). No se repiten aquí.

**Lo que cambia respecto a ese documento.**
- **No empieces hasta que se cierre la decisión (a).** Las passkeys quedan atadas al dominio exacto. Si se crean en `masiapp.netlify.app` y luego el equipo se muda a Vercel, las dos cuentas se pierden y el historial del 24 no tiene a qué colgarse.
- Si se mudan, sustituye `masiapp.netlify.app` por el dominio nuevo en todo el documento, y el PO actualiza la regla del dominio en `CLAUDE.md` y en `masi-scope.md`.
- Con huella **real**, en el teléfono, en la URL principal. El autenticador virtual de DevTools no vale para estas dos cuentas.
- La Function del relayer es B5b.

**Entrega.** Las dos direcciones `C…`, pasadas al frontend (van en `frontend/src/data/providers.json` para Juan y en `frontend/src/config.ts` para María), y los dos hashes de despliegue en el README.

**Ojo con el frente del otro.** El paso 1 de ese documento (meter `passkey-kit` en Acceso y Configuración) toca `frontend/src/screens/AccessScreen.tsx` y `SetupScreen.tsx`. Avisa al frontend antes de tocarlos y haz el cambio en una rama propia (`feat/passkey-acceso`), lo más pequeño posible: crear la cuenta y guardar la dirección `C…`. Nada de rediseño.

**Depende de.** Decisión (a) y B5b. **Estimación:** 2 h (1 h de integración en Acceso y 1 h para crear las dos cuentas).

---

### B7 · Mudanza a Vercel 🔒 decisión (a), solo si se decide

**Objetivo.** El mismo sitio, con Functions y Blob, en Vercel Hobby.

**Pasos.**
1. Importar el repo en Vercel con **Root Directory = `frontend`**, framework Vite, build `npm run build`, output `dist` y Node 24 (el `package.json` exige `>=24.15.0`).
2. Elegir el subdominio `*.vercel.app` **una sola vez** y congelarlo. Es el nuevo dominio de las passkeys.
3. Crear un Blob store **privado** y conectarlo al proyecto (añade `BLOB_STORE_ID` y OIDC; no hace falta token manual).
4. Variables: `RELAYER_API_KEY`, `RELAYER_BASE_URL`, `ESCROW_CONTRACT_ID`, `PEN_SAC_ID`, `WALLET_WASM_HASH`.
5. `frontend/vercel.json` con la regla SPA: es la tarea F7 del frontend.
6. Comprobar que `/passkey-test/` sigue sirviéndose (es estático en `frontend/public/passkey-test/`).

**Criterios de aceptación.**
- [ ] La app carga en el dominio nuevo y un refresco en `/solicitudes/abc` no da 404.
- [ ] `/api/salud` responde JSON.
- [ ] Dominio nuevo anotado en `CLAUDE.md`, `README.MD`, `AVANCE.md` y `TAREA_PASSKEYS_DOMINIO.md` (con el visto bueno del PO, porque `CLAUDE.md` hoy dice que el dominio no se cambia).
- [ ] Netlify queda sin desplegar más y sin tráfico que consuma créditos.

**Depende de.** Decisión (a). Va **antes** de B6. **Estimación:** 1 h.

---

## 2. La API del almacén — el punto de integración

**Esta es la única definición.** El frontend la enlaza desde su documento y no la repite. Si cambia, cambian a la vez esta sección y `shared/api.ts` (B1).

### 2.1 Qué guarda y qué no

| Guarda (fuera de la cadena) | No guarda |
|---|---|
| Solicitudes, postulaciones, cotizaciones finales y texto de las reseñas | Nada de lo que ya es un trabajo después de `create_job`: estado, montos, fechas y estrellas se leen del contrato (`get_job`, `jobs_of`, `rating_of`) |

La cotización guarda el `jobId` que devuelve `create_job`, y a partir de ahí **manda el contrato**. El estado del trabajo (pagado, iniciado…) **no se duplica** en el almacén.

### 2.2 Tipos (`shared/api.ts`)

```ts
import type { Trade } from '../frontend/src/marketplace';

/** Comisión de Masi: 5 %. La paga el cliente encima del total. */
export const FEE_BPS = 500;
/** Tope del contrato para el adelanto (50 %). Por encima, create_job da InvalidBps. */
export const MAX_MATERIALS_BPS = 5000;
/** Plazo de revisión por defecto: 24 h. Decisión del PO del 21/09. */
export const DEFAULT_REVIEW_SECS = 86400;

export type SolicitudEstado =
  | 'buscando_profesionales' // recién publicada; los técnicos pueden postularse
  | 'profesional_elegido'    // el cliente eligió una postulación (M3)
  | 'cotizada'               // el técnico elegido envió la cotización final (M4)
  | 'contratada';            // el cliente aceptó y existe job_id (M5)

export interface Solicitud {
  id: string;                        // UUID, lo genera el servidor
  clienteId: string;                 // dirección C del cliente; hasta que exista, un id local estable
  servicio: Trade;
  descripcion: string;
  fotos: number;                     // cuántas; los archivos no se guardan
  ubicacion: string;
  distrito: string;
  cliente: string;                   // nombre para mostrar
  estado: SolicitudEstado;
  postulacionElegidaId: string | null;
  creadaEn: string;                  // ISO 8601, servidor
  actualizadaEn: string;             // ISO 8601, servidor
}
export type SolicitudInput = Pick<Solicitud,
  'clienteId' | 'servicio' | 'descripcion' | 'fotos' | 'ubicacion' | 'distrito' | 'cliente'>;

export interface Postulacion {
  id: string;
  solicitudId: string;
  providerId: string;                // mismo id que providers.json (p. ej. "juan")
  providerNombre: string;            // copia para que el cliente la vea desde otro teléfono
  providerAddress: string | null;    // C… del técnico; null si todavía no tiene cuenta
  precio: number;                    // soles, referencial; no mueve dinero
  minutos: number;                   // tiempo estimado de llegada
  fecha: string;                     // ISO 8601, servidor
}
export type PostulacionInput = Omit<Postulacion, 'id' | 'fecha'>;

export type CotizacionEstado = 'enviada' | 'aceptada' | 'rechazada';

export interface Cotizacion {
  id: string;
  solicitudId: string;
  postulacionId: string;
  providerId: string;
  providerAddress: string;           // C…; obligatoria: es el `provider` de create_job
  clienteId: string;
  totalStroops: string;              // i128 en decimal. S/1.200 = "12000000000". Es el `amount` de create_job
  materialesStroops: string;         // lo que el técnico declara para materiales
  materialsBps: number;              // floor(materiales * 10000 / total), topado en 5000
  feeBps: number;                    // FEE_BPS
  reviewSecs: number;                // DEFAULT_REVIEW_SECS salvo que se decida otro
  descripcion: string;               // va a create_job; 1..1024 bytes UTF-8
  estado: CotizacionEstado;
  jobId: string | null;              // u64 en decimal; solo con estado 'aceptada'
  txHash: string | null;             // hash de create_job; solo con estado 'aceptada'
  creadaEn: string;
  actualizadaEn: string;
}
export type CotizacionInput = Pick<Cotizacion,
  'solicitudId' | 'postulacionId' | 'providerId' | 'providerAddress' | 'clienteId'
  | 'totalStroops' | 'materialesStroops' | 'materialsBps' | 'feeBps' | 'reviewSecs' | 'descripcion'>;

export type CotizacionPatch =
  | { estado: 'aceptada'; jobId: string; txHash: string }
  | { estado: 'rechazada' };

export interface Resena {
  jobId: string;                     // u64 en decimal; una reseña por trabajo
  providerId: string;
  providerAddress: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  texto: string;                     // 1..500 caracteres
  hash: string;                      // SHA-256 del texto en UTF-8, 64 caracteres hex en minúscula
  creadaEn: string;
}
export type ResenaInput = Omit<Resena, 'jobId' | 'creadaEn'>;

export interface ApiError {
  error: { code: 'INVALID' | 'NOT_FOUND' | 'CONFLICT' | 'NOT_ALLOWED' | 'RELAYER' | 'INTERNAL'; message: string };
}
```

Notas de diseño:

- **Dinero en stroops como string.** `JSON.stringify` revienta con `bigint`, y un `number` pierde precisión por encima de 2^53. El frontend convierte con `BigInt(...)`. El `precio` de la postulación va en soles (`number`) porque es referencial y nunca llega al contrato. Así estaba ya en `DemoContext`.
- **`Solicitud` y `Postulacion` extienden los tipos actuales de `DemoContext.tsx`** (líneas 23-43) sin quitar campos. Se añaden `clienteId`, `postulacionElegidaId`, `actualizadaEn`, `providerNombre`, `providerAddress` y los estados nuevos. `providerNombre` hace falta porque un técnico registrado desde `ProviderSetupScreen` tiene un `id` aleatorio (`crypto.randomUUID()`, línea 55) que no está en `providers.json`, y sin la copia el cliente no sabría cómo se llama.
- **El estado de la postulación se deriva, no se guarda:** es "elegida" si `solicitud.postulacionElegidaId === postulacion.id`.
- **`Trade`** se importa de `frontend/src/marketplace.ts`. El servidor valida contra `TRADES`.

### 2.3 Endpoints

Todas las rutas cuelgan de `/api` en el mismo origen que la app, así que no hace falta CORS. Cuerpos en JSON. Las listas se devuelven como `{ "items": [...] }`, ordenadas por `creadaEn` descendente.

| Método y ruta | Cuerpo | Respuesta | Quién la usa |
|---|---|---|---|
| `GET /api/salud` | — | `200 {"ok":true}` | comprobación de despliegue |
| `GET /api/solicitudes?servicio=&clienteId=&estado=` | — | `200 {items: Solicitud[]}`; filtros opcionales y combinables | técnico (alertas), cliente (mis solicitudes) |
| `POST /api/solicitudes` | `SolicitudInput` | `201 Solicitud` con `estado: 'buscando_profesionales'` | cliente, M1 |
| `GET /api/solicitudes/:id` | — | `200 Solicitud` · `404` | ambos |
| `POST /api/solicitudes/:id/elegir` | `{ "postulacionId": string }` | `200 Solicitud` · `404` · `409` | cliente, M3 |
| `GET /api/postulaciones?solicitudId=&providerId=` | — | `200 {items: Postulacion[]}` | cliente (M3), técnico (actividad) |
| `POST /api/postulaciones` | `PostulacionInput` | `201 Postulacion` · `409` si ese técnico ya se postuló a esa solicitud o no está `buscando_profesionales` | técnico, M2 |
| `GET /api/cotizaciones?solicitudId=&providerId=&clienteId=` | — | `200 {items: Cotizacion[]}` | ambos |
| `POST /api/cotizaciones` | `CotizacionInput` | `201 Cotizacion` con `estado: 'enviada'` · `400` · `409` | técnico, M4 |
| `PATCH /api/cotizaciones/:id` | `CotizacionPatch` | `200 Cotizacion` · `404` · `409` | cliente, M5 |
| `GET /api/resenas?providerId=&providerAddress=` | — | `200 {items: Resena[]}` | perfil del técnico |
| `GET /api/resenas/:jobId` | — | `200 Resena` · `404` | pantalla de trabajo |
| `PUT /api/resenas/:jobId` | `ResenaInput` | `200 Resena` (idempotente: reescribe) · `400` si el hash no cuadra | cliente, M14, **antes** de llamar a `rate` |
| `POST /api/relayer` | `{ "xdr": string }` | ver B5a | todas las firmas |

Ejemplo, técnico enviando la cotización del caso del vídeo (S/1.200 con S/360 de materiales):

```json
POST /api/cotizaciones
{
  "solicitudId": "5b1e…",
  "postulacionId": "c07a…",
  "providerId": "juan",
  "providerAddress": "C…JUAN",
  "clienteId": "C…MARIA",
  "totalStroops": "12000000000",
  "materialesStroops": "3600000000",
  "materialsBps": 3000,
  "feeBps": 500,
  "reviewSecs": 86400,
  "descripcion": "Pintar departamento en Surco"
}
```

Y el cliente aceptándola después de que `create_job` devolvió el trabajo 7:

```json
PATCH /api/cotizaciones/9f3c…
{ "estado": "aceptada", "jobId": "7", "txHash": "a4d8…" }
```

**Errores.** Siempre con la forma de `ApiError`: `400 INVALID` (cuerpo mal formado o validación), `404 NOT_FOUND`, `409 CONFLICT` (transición no permitida) y `500 INTERNAL`. El `message` es para el log, no para la pantalla: el frontend muestra su propia frase.

### 2.4 Transiciones que aplica el servidor

| Acción | Condición | Efecto |
|---|---|---|
| `POST /solicitudes/:id/elegir` | solicitud en `buscando_profesionales` y la postulación es de esa solicitud | solicitud → `profesional_elegido`, `postulacionElegidaId` fijado |
| `POST /cotizaciones` | solicitud en `profesional_elegido`, `providerId` igual al de la postulación elegida, y sin otra cotización `enviada` o `aceptada` para esa solicitud | solicitud → `cotizada` |
| `PATCH` → `aceptada` | cotización `enviada`; `jobId` es un entero decimal > 0; `txHash` tiene 64 caracteres hex | cotización `aceptada`; solicitud → `contratada` |
| `PATCH` → `rechazada` | cotización `enviada` | cotización `rechazada`; solicitud vuelve a `profesional_elegido` (el técnico puede cotizar de nuevo) |

Validaciones de `POST /cotizaciones`: `totalStroops > 0`; `0 <= materialesStroops`; `materialsBps === min(floor(materiales * 10000 / total), 5000)` (en `BigInt`); `feeBps === FEE_BPS`; `reviewSecs > 0`; `descripcion` de 1 a 1024 bytes UTF-8; `providerAddress` con la forma `^C[A-Z2-7]{55}$`. Son las mismas condiciones que `create_job` en `contracts/escrow/src/lib.rs` (líneas 84-98): la idea es que el contrato nunca rechace una cotización que el almacén aceptó.

Nota: si `materialesStroops` supera el 50 % del total, la cotización **sí** se acepta. El adelanto se topa en 50 % y el técnico pone la diferencia, como decidió el PO. No es un error.

### 2.5 Claves en el almacén

```
solicitudes/{id}
postulaciones/{solicitudId}/{id}
cotizaciones/{id}
resenas/{jobId}
```

Un registro por clave. Las listas se arman con `list(prefix)` y una lectura por clave. Con decenas de registros sobra. Sin autenticación: es una demo, y el dinero no pasa por aquí. Va como limitación en el README.

### 2.6 Implementación por proveedor

| | Netlify | Vercel |
|---|---|---|
| Function | `frontend/netlify/functions/api.mts`, `export default (req) => handleApi(req, netlifyStore)`, `export const config = { path: "/api/*" }` | `frontend/api/[...ruta].ts`, `export function GET/POST/PATCH/PUT(req) { return handleApi(req, vercelStore) }`. Si el catch-all no enruta, un rewrite `/api/:ruta*` en `vercel.json` |
| Almacén | `@netlify/blobs`: `getStore({ name: "masi", consistency: "strong" })`, `setJSON`, `get(key, { type: "json" })`, `list({ prefix })` | `@vercel/blob` con store **privado**: `put(key, json, { access: "private", allowOverwrite: true, contentType: "application/json" })`, `get(key, { useCache: false })`, `list({ prefix })` |
| Consistencia | La lectura por defecto es *eventual*: sin `"strong"`, Juan puede no ver la solicitud de María durante un rato | Una sobrescritura tarda hasta 60 s en propagarse por la CDN. `useCache: false` se la salta |
| Local | `netlify dev` (store local aislado) | `vercel dev` tras `vercel env pull` |
| Coste | Cada invocación gasta créditos, y quedan pocos. El frontend consulta cada 10 s y solo con la pestaña visible | Incluido en Hobby |
| SPA | Las Functions con `config.path` deben ganar a `/* /index.html 200` de `_redirects`. **Verifícalo** con `/api/salud` | El rewrite SPA de `vercel.json` debe excluir `/api/` (F7) |

---

## 3. Decisiones que necesito del PO

1. **(a) Hosting: Netlify Personal (9 USD) o Vercel Hobby.** Hoy y antes de B6. Si es Vercel, confirmar el subdominio nuevo y autorizar el cambio de la regla del dominio en `CLAUDE.md`.
2. **(b) ¿Se construye `dispute`/`resolve` hoy?** Si sí, asumir el cambio de contract ID antes del checkpoint del 23.
3. **(c) Plazo de revisión por defecto.** ✅ **24 h**, decidido. Para el vídeo, el `auto_release` se muestra con un trabajo sembrado por CLI con un plazo corto: confirmar que se acepta así.
4. **Que `resolve` sume a `completed_jobs`** además de a `disputes` (motivo en B2). Si el PO prefiere que no, el frontend tiene que relajar la validación de `parseRatingSummary`.
5. **Aceptar que la API no tiene autenticación** y declararlo en el README como limitación de la demo.
