# Estado del proyecto

**Actualizado: 20 de septiembre de 2026, noche.** Entrega el 25. Checkpoint el 23.

Resumen en una línea: **el contrato está terminado y funcionando en testnet, el frontend avanza rápido, y lo único con riesgo de fecha son las passkeys.**

---

## Lo que ya está vivo

| | |
|---|---|
| App | https://masiapp.netlify.app |
| Demo de passkeys | https://masiapp.netlify.app/passkey-test/ |
| Contrato `escrow` | `CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV` |
| SAC de PEN-test | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |
| Red | testnet, protocolo 28 |

Detalle de despliegue y hashes: [`DESPLIEGUE.md`](./DESPLIEGUE.md).

---

## P1 — Contrato ✅

**Terminado y un día por delante del cronograma.** El despliegue estaba previsto para el 21 y se hizo el 20.

- 17/17 tests pasan.
- Flujo completo verificado **en testnet, no solo en tests**: María paga S/1.260, Juan cobra S/1.200 (S/360 de materiales al iniciar y S/840 al aprobar), Masi S/60 de comisión, el contrato queda en cero.
- `rate` implementado: solo el cliente que pagó, una vez, de 1 a 5 estrellas. El hash del comentario se guarda **en el trabajo**, no en el evento, porque los eventos caducan del RPC.
- `auto_release` verificado: rechaza antes del plazo (`ReviewPeriodActive`) y libera después, disparado por una cuenta ajena al trabajo.

**Pendiente:** `dispute` y `resolve` siguen devolviendo `NotImplemented`. Son los primeros de la lista de recortes y no bloquean nada.

## P2 — Cuentas 🔶

**Es el frente con riesgo.** La decisión de fallback es el 22 por la noche.

Hecho:
- Librería elegida: **`passkey-kit`**, con la evidencia en [`P2_PASSKEYS.md`](./P2_PASSKEYS.md).
- Relayer de OpenZeppelin verificado operativo.
- Dominio congelado: `masiapp.netlify.app`.
- **Funcionó en un Android real:** se desplegó una smart wallet con huella.
- El demo está publicado en `/passkey-test/`, que es el **origen correcto**.

Pendiente, en orden:
- [ ] Crear las dos wallets de verdad en `masiapp.netlify.app` → ver [`TAREA_PASSKEYS_DOMINIO.md`](./TAREA_PASSKEYS_DOMINIO.md).
- [ ] El relayer pagando las comisiones (Netlify Function; la clave nunca en el bundle).
- [ ] Probar en iPhone.

> La primera prueba se hizo en `prismatic-crumble-a96f0e.netlify.app`. Las passkeys se atan al origen exacto, así que **esas cuentas no sirven**. Hay que rehacerlo en el dominio bueno.

## P3 / P4 — Frontend 🔶

Avanzó mucho: la app se rehízo como aplicación móvil con `PhoneFrame`, kit de componentes propio y los tokens del style guide.

Pantallas en pie: Splash, Bienvenida, Rol, Acceso, Configuración, Inicio, **Nueva solicitud**, Profesionales, Perfil.

`marketplace.ts` está reconectado vía `useMarketplace.ts`, y **`dataSource.ts` es el único punto a cambiar** para pasar de datos falsos al contrato. La forma ya es la misma, así que es una línea.

Pendiente:
- [ ] **Entrada del proveedor.** `/rol/profesional` sigue siendo un muro con un solo botón de vuelta. Nada del lado de Juan se puede construir ni probar mientras siga así, y tres de las siete escenas del vídeo son suyas.
- [ ] Solicitudes abiertas y enviar oferta (proveedor).
- [ ] Comparar ofertas y aceptar una (cliente) → llama a `create_job`.
- [ ] Trabajo (cliente): pagar, aprobar, calificar.
- [ ] Trabajo (proveedor): "Pago asegurado", iniciar, terminar.
- [ ] Perfil público del proveedor con estrellas y trabajos verificables.
- [ ] Conectar `dataSource.ts` al contrato → [`INTEGRACION.md`](./INTEGRACION.md).
- [ ] Recarga simulada. **La última:** no aparece en ninguna escena del vídeo.

---

## Cambios respecto al scope

Cosas decididas hoy que no están en `masi-scope.md` tal cual:

**1. Modelo de ofertas.** El scope tenía a María eligiendo proveedor y poniendo el precio. Ahora María publica su problema, los proveedores mandan ofertas y ella elige. **El contrato no cambia**: `create_job` recibe un proveedor y un monto, y le da igual cómo se emparejaron. Toda la subasta vive fuera de la cadena. Efecto secundario: la búsqueda pierde importancia y el perfil se alcanza desde la lista de ofertas.

**2. Tres funciones reciben `caller`.** `cancel`, `dispute` y `auto_release` admiten más de un rol, y `require_auth` no puede adivinar a quién exigirle la firma. La tabla del scope ya está actualizada.

**3. Topes de porcentaje.** `materials_bps ≤ 5.000` y `fee_bps ≤ 1.000`. El adelanto es irreversible una vez entregado; sin tope, la promesa de que el riesgo del cliente queda acotado no era cierta.

**4. La cuenta de comisiones sigue siendo una dirección G.** Convertirla a contrato hoy dejaría las comisiones bloqueadas para siempre. Se hará cuando `passkey-kit` esté en pie y pueda ser una smart wallet. Tiene su trustline puesta y funciona.

---

## Riesgos

| Riesgo | Estado |
|---|---|
| Passkeys no llegan a tiempo | Funcionan en Android; falta el dominio bueno. Decisión el 22 por la noche, fallback a Blux definido |
| Perfiles vacíos en el vídeo | Se siembra el 24, y **depende de que exista antes la wallet de Juan** |
| El lado del proveedor no se puede abrir | Bloquea 3 de las 7 escenas. Es lo más urgente del frontend |
| El guion del vídeo quedó desactualizado | Las escenas 1 y 2 describen el modelo viejo. Hay que reescribirlas |

### La cadena que hay que vigilar

Passkeys en el dominio bueno → wallets de María y Juan → **sembrar el historial de Juan contra su dirección definitiva** → perfil verificable en la escena 1.

Si la wallet de Juan no existe antes del 24, su perfil sale vacío justo en la primera escena. Los otros siete proveedores **no necesitan wallet**: no firman nada.

---

## Checkpoint del 23

- [x] Interfaz del contrato — la tabla de `masi-scope.md`, ya alineada con la ABI real
- [x] Contract ID en testnet
- [x] Repo público con README — **existe pero está desactualizado** (dice que `rate` no está implementado y que no hay contrato desplegado)
- [ ] Diagrama de arquitectura — nadie lo ha empezado
- [ ] Decisión sobre passkeys o fallback — el 22 por la noche

---

## Documentos

| Archivo | Para qué |
|---|---|
| [`masi-scope.md`](./masi-scope.md) | Alcance, estados, tabla de funciones, cronograma |
| [`CLAUDE.md`](./CLAUDE.md) | Reglas del proyecto y IDs vivos |
| [`DESPLIEGUE.md`](./DESPLIEGUE.md) | Contract ID, hashes, cómo reproducirlo |
| [`INTEGRACION.md`](./INTEGRACION.md) | Cómo conectar el frontend al contrato |
| [`P2_PASSKEYS.md`](./P2_PASSKEYS.md) | Por qué `passkey-kit` y estado del relayer |
| [`P2_PRUEBA_PASSKEYS.md`](./P2_PRUEBA_PASSKEYS.md) | Guía de prueba y hallazgos |
| [`TAREA_PASSKEYS_DOMINIO.md`](./TAREA_PASSKEYS_DOMINIO.md) | La tarea abierta de P2 |
| [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) | Obligatorio antes de tocar interfaz |
