# Tareas del 21 de septiembre — Backend

> ## ✅ Entregado — 22 de septiembre
>
> **Este documento queda como referencia, no como lista de pendientes.** Todo lo de abajo está
> en `main` y desplegado en `https://masiapp.vercel.app`:
>
> - `dispute` y `resolve` en el contrato, con tests, redesplegados. Contract ID definitivo en `CLAUDE.md`.
> - La API del almacén (sección 2) sobre Vercel Functions + Upstash Redis. Verificado hoy en
>   producción: `/api/salud` responde `{"ok":true}` y `/api/solicitudes` responde 200.
> - La Function del relayer, con la clave solo en variables de servidor.
> - Añadido después: `POST /api/recarga`, que acredita saldo con un `mint` del SAC firmado en el
>   servidor con `ISSUER_SECRET`.
>
> Lo que **sigue abierto** está en [`AVANCE.md`](./AVANCE.md), sección "Lo que falta para
> entregar". De este documento solo queda una cosa: **vaciar Upstash (`FLUSHDB`) antes de grabar
> el vídeo**, para que no salgan las solicitudes `prueba-tpo`.


**Resumen.** Hoy te toca todo lo que no se ve: `dispute` y `resolve` en el contrato con su redespliegue, la API del almacén compartido (solicitudes, postulaciones, cotizaciones y reseñas) y la Function del relayer. Tu primera entrega es **la definición de la API de la [sección 2](#2-la-api-del-almacén--el-punto-de-integración)**, versionada en `shared/api.ts`, porque el frontend trabaja contra ella en paralelo. **Todas las decisiones que te afectaban ya están tomadas** (sección 0), y la disputa con su redespliegue ya está hecha. Checkpoint el 23 y entrega el 25.

Documento hermano: [`TAREAS_21SEP_FRONTEND.md`](./TAREAS_21SEP_FRONTEND.md).


---

## 0. Antes de empezar

### Decisiones del PO — todas cerradas

| Tema | Decisión |
|---|---|
| Hosting | **Vercel Hobby**. Dominio congelado: **`https://masiapp.vercel.app`**. Netlify ya no se usa para nada |
| Disputa | **Se construye.** `dispute` y `resolve` ya están hechos y desplegados (PR #6) |
| `resolve` | **Cuenta como trabajo completado** y también como disputa en el perfil |
| Contract ID | **`CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL`**, definitivo |
| Plazo de revisión por defecto | **24 h** (`86400` s) |
| Datos antes del contrato | **Compartidos**, con la API de este documento |
| Almacén de la API | **Upstash Redis** (Vercel Marketplace, plan gratuito). Ver B4b |

Pendientes que no te bloquean, con la recomendación como valor por defecto: tras publicar, el cliente va al detalle de su solicitud; botón "Tengo un problema" en la pantalla de trabajo; comentario de reseña opcional; y la API sin autenticación, declarado en el README.

### Git

- `main` está protegido por un ruleset: no se empuja directo, todo entra por PR.
- Trabaja en ramas cortas (`feat/api-almacen`, `feat/relayer`) y ábrelas como PR contra **`develop`**. `develop` → `main` se mergea cuando algo tenga que verse en el dominio.
- Vercel Hobby permite 100 despliegues al día, así que ya no hay que racionarlos. Pero **las URLs de preview (`masiapp-git-…vercel.app`) son otro origen**: ahí no se crean passkeys que tengan que durar.
- Los commits y los PR no llevan `Co-Authored-By` ni líneas de atribución (regla de `CLAUDE.md`).

### Orden del día

```
B1 shared/api.ts ──► (el frontend arranca contra los tipos)
B4a núcleo de la API ──► B4b Upstash Redis + Vercel Function
B5a relayer (núcleo) ──► B5b relayer desplegado ──► B6 wallets de María y Juan
B2, B3, B7: ✅ hechas
```

**B1 y B4 no se recortan**: sin almacén compartido, el vídeo sale con los dos roles en un mismo teléfono. Si las passkeys no llegan el 22 por la noche, B5 y B6 pasan al fallback definido en el scope.

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
- [ ] PR a `develop` mergeado **lo primero del día**, y aviso al frontend: es lo único que lo bloquea.
- [ ] Cualquier cambio posterior a la forma del JSON se hace en `shared/api.ts` **y** en la sección 2 de este documento en el mismo PR, avisando al frontend.

**Depende de.** Nada. **Estimación:** 0,5 h.

---

### B2 y B3 · Disputa y redespliegue — ✅ hechas

`dispute` y `resolve` están implementados, con 22 tests, y desplegados en testnet (PR #6). **No las repitas.**

- Contract ID definitivo: **`CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL`**, ya actualizado en `CLAUDE.md`, `INTEGRACION.md`, `DESPLIEGUE.md`, el README y `AVANCE.md`.
- `resolve` suma a la vez un trabajo completado y una disputa, así que calificar después mantiene `rating_count <= completed_jobs`.
- El caso de disputa con reparto 70/30 está verificado en red; los hashes están en [`DESPLIEGUE.md`](./DESPLIEGUE.md).

Lo único que te queda de esto: en B5a, `ESCROW_CONTRACT_ID` vale `CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL`.

---

### B4a · Núcleo de la API del almacén, independiente del proveedor

**Objetivo.** Implementar los endpoints de la [sección 2](#2-la-api-del-almacén--el-punto-de-integración) sobre una interfaz de almacenamiento propia, sin depender todavía de Upstash. Así los tests corren en memoria.

**Por qué importa.** Hoy las solicitudes y postulaciones viven en el `localStorage` (`frontend/src/demo/DemoContext.tsx`, claves `masi.demo.solicitudes.v1` y `masi.demo.postulaciones.v1`), así que lo que publica María en su teléfono nunca le llega a Juan. Sin esto, el vídeo se graba con los dos roles en el mismo navegador.

**Archivos.**
- Nuevo: `frontend/server/store.ts`, con la interfaz `KeyValueStore { get(key): Promise<unknown | null>; set(key, value): Promise<void>; list(prefix): Promise<string[]> }` y una implementación en memoria para los tests.
- Nuevo: `frontend/server/api.ts`, con `handleApi(req: Request, store: KeyValueStore): Promise<Response>`: enrutado, validación, transiciones de estado y errores.
- Nuevo: `frontend/server/api.test.ts` (Vitest, ya instalado).
- Va dentro de `frontend/` porque el Root Directory del proyecto en Vercel es `frontend`: ahí está el `package.json` que usa el build.

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

### B4b · Upstash Redis y la API desplegada en Vercel

**Objetivo.** Conectar `handleApi` a Upstash Redis y dejarlo respondiendo en `https://masiapp.vercel.app/api/…`.

**Por qué Redis y no Vercel Blob.** Blob es almacenamiento de archivos: sus lecturas pasan por caché, y el plan Hobby solo incluye 2.000 operaciones "avanzadas" al mes, que es lo que cuestan escribir y listar. Con dos teléfonos consultando cada 10 s se agotan en horas. Upstash Redis es la opción de Vercel para datos que se leen y escriben constantemente, y su plan gratuito da 500.000 comandos, 256 MB y 10 GB de tráfico al mes (comprobado el 21/09). Blob queda para las fotos de las solicitudes, si algún día se guardan de verdad.

**Pasos.**
1. En el panel de Vercel del proyecto: *Storage → Marketplace → Upstash (Redis)*, plan gratuito, y conectarlo al proyecto. La integración añade sola las variables de entorno.
2. `npm install @upstash/redis` dentro de `frontend/`.
3. `frontend/server/redisStore.ts`: implementa `KeyValueStore` con `Redis.fromEnv()`. `get` → `redis.get(key)`; `set` → `redis.set(key, value)`; `list(prefix)` → `redis.scan` con `match: `${prefix}*``, repitiendo hasta que el cursor vuelva a `0`. Con decenas de registros sobra.
4. `frontend/api/[...ruta].ts`: `export function GET/POST/PATCH/PUT(req: Request) { return handleApi(req, redisStore) }`. Si el catch-all no enruta, un rewrite `/api/:ruta*` en `vercel.json`.
5. Comprueba en *Settings → Environment Variables* qué nombres inyectó la integración (`UPSTASH_REDIS_REST_*` o `KV_REST_API_*`). Si `Redis.fromEnv()` no los encuentra, pásalos a mano con `new Redis({ url, token })`.
6. En local: `vercel link` y `vercel env pull .env.local`, y después `vercel dev`.

**Criterios de aceptación.**
- [ ] `GET /api/salud` responde `{"ok":true}` en `masiapp.vercel.app` y **no** devuelve el `index.html` de la regla SPA (`frontend/vercel.json` ya excluye `/api/`).
- [ ] Publicar una solicitud desde un teléfono y leerla desde otro dispositivo en menos de 5 s. Upstash es de lectura consistente por defecto, así que no hace falta nada especial.
- [ ] Ningún secreto en el repo ni en variables `VITE_`.
- [ ] Documentado en `DESPLIEGUE.md`: qué base de Upstash es, cómo se vacía antes de grabar el vídeo (`FLUSHDB` desde la consola de Upstash) y qué variables hay.

**Depende de.** B4a. **Estimación:** 1 h.

---

### B5a · Relayer: Function que envía las transacciones firmadas

> **⚠️ Ya existe un relayer, y no sirve para el escrow (hallazgo del 21/09).** El demo de `/passkey-test/` usa el relayer-proxy oficial de `passkey-kit`, desplegado a mano en Cloudflare Workers: `https://passkey-kit-relayer-proxy.josspe-masi.workers.dev`. Ese Worker **solo** patrocina dos cosas: desplegar una wallet y llamar a métodos de administración de la propia wallet (`ALLOWED_WALLET_FUNCTIONS = add_signer, add_secp256r1, update_signer, remove_signer, upgrade`). Cualquier llamada a otro contrato la rechaza con 403 (`relayer-proxy/src/index.ts`, línea 426). Es decir: **sirve para B6 (crear las wallets), pero no para `fund`, `start`, `submit`, `approve`, `rate` ni `dispute`**. Para eso sigue haciendo falta esta tarea. Cuando B5 esté desplegado y cubra también el despliegue de wallets, el Worker se puede retirar: así queda un solo relayer, dentro de nuestro repo.

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

### B5b · Relayer desplegado

**Objetivo.** `handleRelayer` publicado como Function en el dominio definitivo.

**Archivos.** `frontend/api/relayer.ts`. Variables en *Vercel → Settings → Environment Variables*: `RELAYER_API_KEY`, `RELAYER_BASE_URL=https://channels.openzeppelin.com/testnet`, `ESCROW_CONTRACT_ID=CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL`, `PEN_SAC_ID=CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` y `WALLET_WASM_HASH`.

**Criterios de aceptación.**
- [ ] Una transacción firmada con el autenticador virtual de Chrome DevTools en el dominio se envía y aparece en stellar.expert, **sin XLM en la cuenta del usuario**. Cómo activar el autenticador virtual: [`P2_PRUEBA_PASSKEYS.md`](./P2_PRUEBA_PASSKEYS.md), sección de escritorio. En Linux no hay autenticador de plataforma.
- [ ] `POST /api/relayer` no queda tapado por la regla SPA (`vercel.json` ya excluye `/api/`).

**Depende de.** B5a. **Estimación:** 0,5 h.

---

### B6 · Wallets definitivas de María y Juan

**Objetivo y pasos:** están completos en [`TAREA_PASSKEYS_DOMINIO.md`](./TAREA_PASSKEYS_DOMINIO.md), ya actualizado a Vercel. No se repiten aquí.

**Lo que conviene recordar.**
- **Hoy se puede hacer con el Worker de Cloudflare**, sin esperar a B5b: solo patrocina despliegues de wallet, que es justo lo que hace falta aquí. Lo único que exige es que su variable `ALLOWED_ORIGINS` incluya **exactamente** `https://masiapp.vercel.app` (sin barra final), seguido de `wrangler deploy`. Si no, el navegador bloquea la petición por CORS.
- **Ni los contratos ni el bundle de `/passkey-test/` tienen el dominio grabado.** El `rpId` de la passkey se toma solo del `location.hostname` del navegador, y ni el escrow ni la wallet guardan el dominio. Cambiar de dominio **no** exige tocar contratos ni recompilar el demo: solo el `ALLOWED_ORIGINS` del Worker.
- **Solo en `https://masiapp.vercel.app`.** Las passkeys quedan atadas al dominio exacto: nada creado en `masiapp.netlify.app`, en `localhost` ni en una URL de preview `masiapp-git-…` sirve después.
- Con huella **real**, en el teléfono. El autenticador virtual de DevTools no vale para estas dos cuentas.
- El relayer es B5b: sin él, no llegan a la red.

**Entrega.** Las dos direcciones `C…`, pasadas al frontend (van en `frontend/src/data/providers.json` para Juan y en `frontend/src/config.ts` para María), y los dos hashes de despliegue en el README.

**Ojo con el frente del otro.** El paso 1 de ese documento (meter `passkey-kit` en Acceso y Configuración) toca `frontend/src/screens/AccessScreen.tsx` y `SetupScreen.tsx`. Avisa al frontend antes de tocarlos y haz el cambio en una rama propia (`feat/passkey-acceso`), lo más pequeño posible: crear la cuenta y guardar la dirección `C…`. Nada de rediseño.

**Depende de.** B5b. **Estimación:** 2 h (1 h de integración en Acceso y 1 h para crear las dos cuentas).

---

### B7 · Mudanza a Vercel — ✅ hecha

El proyecto ya está en Vercel con Root Directory `frontend` y responde en **`https://masiapp.vercel.app`**. `frontend/vercel.json` tiene la regla SPA, excluyendo `/api/` y `/passkey-test/`, y los refrescos en rutas internas ya no dan 404 (comprobado). El dominio está actualizado en `CLAUDE.md` y en los documentos.

Lo único que queda son las variables de entorno de B4b y B5b.

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

### 2.6 Implementación en Vercel

| | |
|---|---|
| Function | `frontend/api/[...ruta].ts`, `export function GET/POST/PATCH/PUT(req) { return handleApi(req, redisStore) }`. Si el catch-all no enruta, un rewrite `/api/:ruta*` en `vercel.json` |
| Almacén | Upstash Redis con `@upstash/redis`: `Redis.fromEnv()`, `get`, `set` y `scan` con `match: "prefijo*"` |
| Consistencia | Una escritura se lee de inmediato desde otro dispositivo |
| Local | `vercel dev`, después de `vercel link` y `vercel env pull .env.local` |
| Coste | Plan gratuito de Upstash: 500.000 comandos al mes. El frontend consulta cada 10 s, y solo con la pestaña visible |
| SPA | `frontend/vercel.json` ya excluye `/api/` de la regla SPA |

---

## 3. Decisiones del PO

Todas las que te bloqueaban están cerradas; ver la tabla de la sección 0. Si durante el día aparece una nueva, se la llevas al PO en vez de suponerla.
