# Conectar el frontend al contrato

Para P3 y P4. El contrato está vivo en testnet y responde; esto es cómo leerlo y escribirlo desde el navegador.

| | |
|---|---|
| Contrato `escrow` | `CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV` |
| SAC de PEN-test | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |
| RPC | `https://soroban-testnet.stellar.org` |
| Frase de red | `Test SDF Network ; September 2015` |

Los tipos ya están escritos en [`shared/escrow.ts`](./shared/escrow.ts). El ABI real es el código Rust de `contracts/escrow/`; si algo no cuadra, manda el Rust.

---

## Cinco reglas que evitan casi todos los errores

1. **Los montos son `i128` en stroops, con 7 decimales.** S/1.200 se escribe `12000000000`. En JavaScript llegan como `bigint`, **nunca** como `number`. Dividir entre `1e7` solo al formatear para la pantalla.
2. **`u32` decodifica a `number`; `u64` e `i128` a `bigint`.** `JSON.stringify` revienta con `bigint`: conviértelo tú antes.
3. **Las direcciones de los usuarios empiezan por `C`.** No necesitan trustline ni tienen frase semilla. Si un ejemplo de Stellar te hace crear trustlines o leer `account.balances`, está escrito para direcciones `G` y no sirve.
4. **El historial se lee del storage, no de los eventos.** Los eventos caducan del RPC a los pocos días. Úsalos solo para refrescar la pantalla en vivo; para "¿qué trabajos tiene Juan?" llama a `jobs_of`.
5. **Las lecturas no cuestan nada ni piden firma.** `get_job`, `jobs_of` y `rating_of` se resuelven simulando. Solo las escrituras necesitan firma y relayer.

---

## Leer: sustituir el mock de calificaciones

`frontend/src/marketplace.ts` ya tiene la costura correcta. `loadMarketplace` recibe cualquier cosa que cumpla `RatingSource`:

```ts
export interface RatingSource {
  rating_of(provider: string): Promise<RatingSummary>;
}
```

Hoy le pasa `mockRatingSource`. Conectar es escribir la versión real y pasarla en su lugar — **no hay que tocar nada más**.

```ts
// frontend/src/escrow.ts
import { contract } from '@stellar/stellar-sdk';
import type { RatingSource, RatingSummary, Job, JobId } from '../../shared/escrow';

const CONTRACT_ID = 'CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

interface EscrowContract {
  rating_of: (args: { provider: string }) => Promise<contract.AssembledTransaction<RatingSummary>>;
  jobs_of: (args: { provider: string }) => Promise<contract.AssembledTransaction<JobId[]>>;
  get_job: (args: { job_id: JobId }) => Promise<contract.AssembledTransaction<Job>>;
}

let cached: Promise<contract.Client & EscrowContract> | null = null;

// Client.from lee el ABI del propio contrato en la red, asi que no hay codegen.
const client = () => (cached ??= contract.Client.from<EscrowContract>({
  contractId: CONTRACT_ID,
  rpcUrl: RPC_URL,
  networkPassphrase: NETWORK_PASSPHRASE,
}));

/** Misma forma que mockRatingSource: intercambiables. */
export const contractRatingSource: RatingSource = {
  async rating_of(provider) {
    const tx = await (await client()).rating_of({ provider });
    return tx.result;   // simulado: sin firma, sin comision
  },
};
```

Y en la pantalla:

```ts
- const data = await loadMarketplace(mockRatingSource);
+ const data = await loadMarketplace(contractRatingSource);
```

`averageRating` y `formatRating` ya funcionan sobre lo que devuelve: el promedio es `stars_sum / rating_count`, y sin reseñas se muestra "Sin reseñas".

### Lo que devuelve de verdad

Verificado por CLI contra el contrato desplegado:

```
rating_of(juan) → {"completed_jobs":2,"disputes":0,"rating_count":1,"stars_sum":5}
jobs_of(juan)   → [1, 2]
```

Fíjate en que `completed_jobs` (2) y `rating_count` (1) **no coinciden**, y está bien: el segundo trabajo se cobró por `auto_release` porque el cliente no respondió, así que nunca se calificó. La pantalla tiene que soportar un proveedor con trabajos completados y cero reseñas.

---

## Escribir: las que piden huella

Las escrituras necesitan la firma del rol correspondiente y que el relayer pague. Eso depende de que P2 termine passkey-kit; hasta entonces se pueden probar por CLI (ver [`DESPLIEGUE.md`](./DESPLIEGUE.md)).

La tabla completa de funciones está en `masi-scope.md`. Lo que conviene tener presente al construir las pantallas:

| Pantalla | Llama a | Quién firma |
|---|---|---|
| Solicitar trabajo | `create_job` | cliente |
| Trabajo (proveedor) | `accept`, `start`, `submit` | proveedor |
| Pagar protegido | `fund` | cliente |
| Aprobar | `approve` | cliente |
| Calificar | `rate` | cliente |
| — | `auto_release` | **cualquiera**, pasando su propia dirección |

`cancel`, `dispute` y `auto_release` reciben un parámetro `caller` porque admiten más de un rol y el contrato no puede adivinar a quién exigirle la firma.

`dispute` y `resolve` **todavía devuelven `NotImplemented`**. No construyas la pantalla de disputa contra ellas aún.

### `rate`, en detalle

```ts
rate({ job_id, stars, comment_hash })
```

- `stars` de 1 a 5. Fuera de rango: `InvalidStars` (#16).
- Solo desde `Released` o `Resolved`, y **una sola vez**: el segundo intento da `AlreadyRated` (#15).
- Solo el cliente que pagó.
- `comment_hash` son 32 bytes: el SHA-256 del comentario. **El texto se guarda fuera de la cadena**; en el contrato solo va el hash, para que no se pueda editar después sin que se note. El hash queda en el propio trabajo, así que `get_job` lo devuelve.

---

## Errores del contrato

Llegan como `Error(Contract, #N)`. Tradúcelos a lenguaje humano — el usuario nunca ve un número:

| # | Nombre | Qué decirle a la persona |
|---|---|---|
| 3 | `JobNotFound` | "No encontramos ese trabajo." |
| 4 | `InvalidState` | "Este trabajo ya avanzó. Actualiza la página." |
| 5 | `Unauthorized` | "No puedes hacer esto en este trabajo." |
| 6 | `InvalidAmount` | "El monto no es válido." |
| 7 | `InvalidBps` | "El adelanto no puede pasar del 50%." |
| 12 | `ReviewPeriodActive` | "Todavía estás a tiempo de revisar el trabajo." |
| 13 | `NotImplemented` | Función aún no construida; no debería llegarle al usuario. |
| 15 | `AlreadyRated` | "Ya calificaste este trabajo." |
| 16 | `InvalidStars` | "Elige entre 1 y 5 estrellas." |

Los códigos no se renumeran nunca: al añadir errores nuevos se anexan al final.

---

## Antes de dar por buena la integración

- [ ] Ningún monto se muestra en stroops; todo en soles.
- [ ] No aparecen las palabras *wallet*, *XLM*, *gas* ni *seed phrase*.
- [ ] Los errores del contrato se traducen a frases, no a números.
- [ ] El hash de la transacción va en una sección secundaria "Ver detalles", no en primer plano.
- [ ] Un proveedor sin reseñas se ve bien (dice "Sin reseñas", no "0 estrellas").
- [ ] Nada del historial depende de eventos del RPC.

> **Nota sobre este documento:** los comandos y los datos de ejemplo están verificados contra el contrato desplegado por CLI. El código TypeScript sigue el patrón oficial de `contract.Client` del stellar-sdk, pero aún no se ha ejecutado en el navegador — la primera persona que lo corra, que corrija aquí lo que haga falta.
