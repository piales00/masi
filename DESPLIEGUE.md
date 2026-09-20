# Despliegue en testnet

**20 de septiembre de 2026.** Red: `Test SDF Network ; September 2015`. Protocolo 28.

Contrato desplegado, inicializado y con el flujo principal ejecutado de punta a punta. Cubre el punto "Contract ID en testnet" del checkpoint del 23.

---

## Identificadores

| Qué | ID |
|---|---|
| **Contrato `escrow`** | `CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV` |
| **SAC de PEN-test** | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |
| Hash del WASM | `d37dfd73161cd59a244687c612d78974a66c916a019bc5440b8a766b69038bb7` |
| Activo | `PENT:GBEL5YQVA7322R26DWRQTJSZPZ7ODD5NSCQZ6TDPD5MP4FAUDXNITYAE` |

- Explorador: [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV)
- Tamaño del WASM: 17 KB, muy por debajo del límite de 128 KB de la red.

> **Despliegue anterior, ya superado:** `CAV3YGS5Z5JIOHW7V6OAMLTZLFKR6CHZZJBHNEU3MGHT56FMCYTMELLO`, sin `rate`. El contrato no tiene función de actualización, así que añadir `rate` obligó a desplegar de nuevo. **Usa siempre el ID de arriba.**

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

## Lo que este despliegue todavía no prueba

- `dispute` y `resolve` siguen siendo stubs: devuelven `NotImplemented` y no mueven fondos. Son los primeros de la lista de recortes.
- `auto_release` no se ejecutó, porque exige esperar `review_secs`. Para probarlo, crea un trabajo con `review_secs` corto (60 segundos) en vez de 86.400.
- Nada se ha probado aún con direcciones C ni con passkeys. Eso es el punto de integración del 22.
