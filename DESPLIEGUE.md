# Despliegue en testnet

**20 de septiembre de 2026.** Red: `Test SDF Network ; September 2015`. Protocolo 28.

Contrato desplegado, inicializado y con el flujo principal ejecutado de punta a punta. Cubre el punto "Contract ID en testnet" del checkpoint del 23.

---

## Identificadores

| Qué | ID |
|---|---|
| **Contrato `escrow`** | `CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL` |
| **SAC de PEN-test** | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |
| Hash del WASM | `786f21b988ce6c15e1ab7b0c5edbc3c5ee6e110ba301539a3fa275fe0318d73d` |
| Activo | `PENT:GBEL5YQVA7322R26DWRQTJSZPZ7ODD5NSCQZ6TDPD5MP4FAUDXNITYAE` |

- Explorador: [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL)
- Tamaño del WASM: 19 KB, muy por debajo del límite de 128 KB de la red.

> **Despliegues anteriores, ya superados:** `CAV3YGS5Z5JIOHW7V6OAMLTZLFKR6CHZZJBHNEU3MGHT56FMCYTMELLO` (sin `rate`) y `CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV` (sin `dispute`). El contrato no tiene función de actualización, así que cada función nueva obligó a desplegar de nuevo. **Usa siempre el ID de arriba.** Las secciones "El caso del demo", "Calificación" y "Segundo caso" de más abajo se ejecutaron sobre esos despliegues anteriores; el código de esas funciones no cambió.

## Cuentas

| Alias | Rol | Dirección |
|---|---|---|
| `masi` | admin y árbitro | `GBGZZ3XKNJSMX3MNXB2J26WVV76ZJAKKOH2C35ZF5G4W2COZAMC7I77C` |
| `masi-issuer` | emisor de PEN-test | `GBEL5YQVA7322R26DWRQTJSZPZ7ODD5NSCQZ6TDPD5MP4FAUDXNITYAE` |
| `masi-platform` | comisiones | `GDY6ZZ4TKCEO4SPQE2JNKK2WKCQDITYDJYCTRB5MSYBKEDQXG74RNZMK` |
| `maria` | cliente de prueba | `GBMETOUI6GYTMGBLN37II44FMNCFRXM7X4CGXG4NUQUQS6UT2PUSGX6V` |
| `juan` | proveedor de prueba | `GCBAMAMWPM5NJRIOGLONHNOYNC6Q3HHRWD3L7XYPRQYVHDKCVQVICHDR` |

Las llaves privadas están en `~/.config/stellar/identity/*.toml` de la máquina donde se desplegó, **fuera del repo**. Si alguien más necesita desplegar, genera las suyas: estas son de testnet y desechables.

`maria` y `juan` son direcciones G solo para esta prueba por CLI. Los usuarios reales tendrán direcciones C (contratos de cuenta con passkey), que **no necesitan trustline**.

## Transacciones

| Paso | Hash |
|---|---|
| Subida del WASM | `a4d86bf65402f7cb00ed5ace1d3f9159c5697f983bfa30249bbd9f999f4354e4` |
| Despliegue del contrato | `74eca7ccaff7fb62755ab1645a60aeb8fece8c86ab2e075678e64f71e633b584` |
| Despliegue del SAC | `af3f4d8c8e4e8399bae8ea6b6326c1f1f24fe78265ce09481f60d3cdc9f60fd9` |
| `init` | `26cf108387834235b15b41811e9d855f3df07cbca4195f58d41d0d1ec597b5df` |
| `mint` de S/1.260 a María | `b8ea9a223b59fa9dfb4534a36ffbafae9c022fc1d0f89a8c4ddccb5f6cd85fa7` |
| `rate` (5 estrellas al trabajo 1) | `b1c9de01bc84fb3c4a7c7ac899d2257a9d354b52747c882a3e638edcaf6a6c66` |
| `auto_release` (trabajo 2, cliente ausente) | `e63a2c774ae4c4f79181218e54a056139d047db52657c7c21cc696198f0355cf` |

Los hashes de subida, despliegue e `init` de arriba corresponden al **primer** despliegue. El SAC, el emisor y las cuentas no cambiaron; solo se redesplegó el escrow.

Cualquiera verifica un hash en `https://stellar.expert/explorer/testnet/tx/<hash>`.

---

## El caso del demo, ejecutado

Trabajo 1: pintar un departamento en Surco por **S/1.200**, con 30% de materiales y 5% de comisión.

`create_job` → `accept` → `fund` → `start` → `submit` → `approve`, cada paso firmado por el rol que le toca.

Reparto final, verificado leyendo los saldos del SAC:

| Cuenta | Saldo | Por qué |
|---|---|---|
| María (cliente) | S/0,00 | Pagó S/1.260: precio más comisión |
| Juan (proveedor) | **S/1.200,00** | S/360 de materiales al iniciar + S/840 de saldo al aprobar |
| Masi (plataforma) | **S/60,00** | 5% de S/1.200 |
| Contrato | S/0,00 | Queda vacío: no retiene nada tras liberar |

Estado del trabajo: `Released`. `jobs_of(juan)` devuelve `[1]`, así que el historial on-chain del perfil ya tiene de dónde leer.

### Calificación, verificada en testnet

María calificó el trabajo con **5 estrellas** y el hash SHA-256 de su comentario:

```
comment_hash: e1b41f0883aa4bed728748a779a0d580cc73a53578ecb0c2f80dcb21da29e360
rating_of(juan) → {"completed_jobs":1,"disputes":0,"rating_count":1,"stars_sum":5}
```

El promedio del perfil sale de `stars_sum / rating_count`. Ambos viven en storage persistente, no en eventos, porque los eventos caducan del RPC a los pocos días.

El hash del comentario queda **en el propio trabajo** (`get_job` lo devuelve), por la misma razón: así el texto guardado fuera de la cadena no se puede editar después sin que se note.

Intentar calificar una segunda vez devuelve `Error(Contract, #15)` — `AlreadyRated`. Una calificación por trabajo, y solo del cliente que pagó.

---

## Trampa encontrada: la cuenta de comisiones necesita trustline

`approve` falló la primera vez con `Error(Contract, #13)` y este diagnóstico:

```
"trustline entry is missing for account", GDY6ZZ4T…  ← masi-platform
```

El pago del saldo a Juan ya había funcionado en esa misma transacción, pero al fallar la comisión **revirtió todo**, que es el comportamiento correcto: o se reparte entero o no se reparte.

La causa es la asimetría que el scope describe, aplicada a una cuenta nuestra: **las direcciones G necesitan trustline, las C no.** Es fácil acordarse para los usuarios y olvidarlo para la cuenta de comisiones.

### Decisión tomada: la cuenta de comisiones sigue siendo G por ahora

Se evaluó convertirla a dirección C para que ninguna cuenta del sistema necesitara trustline. **Se descartó hacerlo hoy**, por esta razón:

Para que una dirección C transfiera tokens, el SAC exige que el propio contrato invoque la transferencia, o sea que tenga código para hacerlo. Un contrato cualquiera puesto como cuenta de comisiones recibiría el dinero sin problema y lo dejaría **bloqueado para siempre**, sin forma de autorizar una salida. Eso cambia un fallo ruidoso y de una sola vez por uno silencioso e irreversible.

La forma correcta es que la cuenta de comisiones sea **una smart wallet como la de los usuarios**: un contrato de cuenta con passkey, que sí sabe firmar transferencias. Es lo que P2 levanta con `passkey-kit`, así que **se hará cuando esa pieza funcione**, y hasta entonces la cuenta G con su trustline cumple.

La trustline ya está puesta y verificada:

```bash
stellar tx new change-trust --source-account masi-platform \
  --network testnet --line "PENT:<G_DEL_EMISOR>"
```

**Si se despliega en un entorno nuevo, este paso no se puede olvidar** o `approve` revertirá.

---

## Reproducir el despliegue

Requiere `stellar` CLI 28.x. En Arch, instálalo desde el binario oficial de la release — `cargo install stellar-cli` falla al enlazar Binaryen contra el LLVM del sistema.

```bash
stellar contract build

stellar contract deploy \
  --wasm target/wasm32v1-none/release/masi_escrow.wasm \
  --source-account masi --network testnet \
  -- --admin masi

stellar contract invoke --id <CONTRATO> --source-account masi --network testnet -- \
  init --arbiter <G_ARBITRO> --platform <G_PLATAFORMA> --token <SAC>
```

`init` solo corre una vez: la segunda devuelve `AlreadyInitialized`.

---

## Segundo caso: el cliente no responde

Es la sexta escena del vídeo. Trabajo 2, idéntico al primero salvo en el plazo de revisión: **60 segundos** en vez de 86.400, para poder verlo dentro de una sesión.

`create_job` → `accept` → `fund` → `start` → `submit`, y a partir de ahí María no hace nada.

**Antes de vencer el plazo**, `auto_release` se rechaza:

```
Error(Contract, #12)  → ReviewPeriodActive
```

Eso es lo que impide que nadie adelante el cobro.

**Pasado el plazo**, lo dispara una cuenta llamada `bot`, que no es ni el cliente ni el proveedor — el scope dice que `auto_release` lo puede llamar cualquiera, y probarlo con una cuenta ajena es la única forma de demostrarlo. Si lo lanzara Juan no sabríamos si funciona por ser el proveedor o por valer para todos.

```
estado: Released | released_at: 1789930342 | pendiente: 0
```

El plazo vencía en `1789930322`, así que se liberó 20 segundos después. El reparto es idéntico al de una aprobación manual: saldo al proveedor y comisión a la plataforma.

Saldos acumulados tras los dos trabajos de este contrato, más el del despliegue anterior:

| Cuenta | Saldo |
|---|---|
| Juan | S/3.600,00 — tres trabajos de S/1.200 |
| Masi (plataforma) | S/180,00 — tres comisiones de S/60 |
| Contrato | S/0,00 |

Y `rating_of(juan)` devuelve `completed_jobs: 2, rating_count: 1, stars_sum: 5`: los dos trabajos de este contrato cuentan como completados, pero solo el primero está calificado. **Cobrar y calificar son cosas distintas**, que es justo lo que hace que las estrellas signifiquen algo.

## Tercer caso: el cliente no está conforme — disputa

Desplegado el 21/09 sobre `CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL`, tras decidir el PO construir la disputa y que `resolve` cuente como trabajo completado.

Trabajo 1: mismo trato de S/1.200, con 30 % de materiales y 5 % de comisión. `create_job` → `accept` → `fund` → `start` → `submit`, y en vez de aprobar, **María abre una disputa**.

| Paso | Hash |
|---|---|
| `init` | `b6c682fa49a2c62566178b9c8424678d2351062bcf65ba8e354fddf2d9603554` |
| `fund` | `d34f21efb7e188452b95689d9ae3fe1f1f4c947506c8b86dd0c39b3ba6ebacb3` |
| `start` | `af4bb849867861fb2aba3dd4dc7a2cb4be4707f02bf9932667115154ea7b9fa5` |
| `dispute` (María) | `f4c6a820c77d153dd1bd73d0d1b02edafa6be964f584f69aa8ea33721611ac11` |
| `resolve` 70 % al técnico (árbitro) | `c78da7c2043bb15ba7581a47fccf7ceaf7b4342116cea68b712ee4a85e08523e` |
| `rate` 3 estrellas | `156df083ae2ded484617b7928448f842aa2c751639a2d66369b90229f3501941` |

Durante la disputa, `approve` se rechaza con `Error(Contract, #4)` (`InvalidState`): el saldo queda congelado hasta que decide el árbitro.

El árbitro reparte **solo el saldo** de S/840. El adelanto de S/360 ya era de Juan y no entra:

| Cuenta | Movimiento |
|---|---|
| Juan | **+S/948**: S/360 de materiales al iniciar + S/588 (70 % del saldo) |
| María | recupera **S/252** (30 % del saldo) |
| Masi | **+S/60** de comisión, igual que en cualquier trabajo |
| Contrato | S/0 |

```
rating_of(juan) → {"completed_jobs":1,"disputes":1,"rating_count":1,"stars_sum":3}
```

`resolve` suma a la vez un trabajo completado y una disputa. Por eso calificar un trabajo resuelto deja el perfil coherente: nunca hay más reseñas que trabajos. Y la disputa queda registrada en el perfil, a la vista de cualquier cliente.

---

## Relayer del demo de passkeys (Cloudflare Worker)

**Desplegado a mano, fuera de este repo.** Documentado aquí para que no dependa de una sola persona.

| | |
|---|---|
| URL | `https://passkey-kit-relayer-proxy.josspe-masi.workers.dev` |
| Código | `relayer-proxy/` del repo oficial `stellar/passkey-kit`, sin cambios conocidos |
| Cuenta de Cloudflare | la de Jossep (`josspe-masi`) |
| Lo usa | el bundle de `frontend/public/passkey-test/`, que tiene esta URL grabada al compilar |
| Qué patrocina | solo despliegues de wallet y métodos de administración de la wallet (`add_signer`, `add_secp256r1`, `update_signer`, `remove_signer`, `upgrade`). **No relaya llamadas al escrow** |
| Variable crítica | `ALLOWED_ORIGINS` debe contener exactamente `https://masiapp.vercel.app` |

Para redesplegarlo, desde un clon de `stellar/passkey-kit`: ajustar `relayer-proxy/wrangler.toml` y ejecutar `wrangler deploy` con la cuenta dueña. **Pendiente de su dueño:** confirmar el valor actual de `ALLOWED_ORIGINS` y si el Worker lleva algún cambio respecto al oficial.

El relayer de la app, el que patrocinará `fund`, `start`, `submit`, `approve`, `rate` y `dispute`, corre en Vercel.

---

## Lo que este despliegue todavía no prueba

- Nada se ha probado aún con direcciones C ni con passkeys. Eso es el punto de integración del 22.

## Vercel, Upstash y relayer

Actualización P2 (22/09/2026): el entorno personal autorizado de pruebas es
`https://masiapp-nine.vercel.app`, proyecto `masiapp` de `jossepv117-5688`.
Usa la base Upstash **masi-pruebas**. No reemplaza el dominio del equipo descrito
abajo. `VITE_STORE=api` activa datos y pedidos simulados compartidos; las claves
adicionales `demo-trabajos/` almacenan únicamente simulaciones. Nunca se debe vaciar
la base compartida sin aprobación del equipo. La revisión actual está en
[`AVANCE.md`](./AVANCE.md); los relatos históricos de este archivo no prueban la
integración actual de passkeys y pagos.

El proyecto de Vercel usa `frontend` como **Root Directory** y publica en
`https://masiapp.vercel.app`. La configuración SPA está en `frontend/vercel.json`;
las rutas `/api/` y `/passkey-test/` quedan fuera del fallback a `index.html`.

En Vercel se configuran, para producción, las variables listadas en
`frontend/.env.example`. `RELAYER_API_KEY` y los tokens de Upstash son secretos:
no se copian al repositorio ni se crean con prefijo `VITE_`.

La base de Upstash se conecta desde **Storage → Marketplace → Upstash Redis**.
La API utiliza las claves `solicitudes/`, `postulaciones/`, `cotizaciones/` y
`resenas/`. Antes de grabar el video, se vacía exclusivamente esta base de demo
con `FLUSHDB` desde la consola de Upstash; esa operación elimina todos sus datos.

Comprobaciones posteriores al despliegue:

```text
GET  https://masiapp.vercel.app/api/salud
POST https://masiapp.vercel.app/api/relayer
```

`/api/salud` debe devolver `{"ok":true}` y nunca el HTML de la aplicación.
