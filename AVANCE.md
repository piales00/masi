# Estado del proyecto

**Actualizado: 22 de septiembre de 2026, tarde.** Entrega el 25. Checkpoint el 23.

En una línea: **el producto está construido de punta a punta y desplegado contra el contrato real de testnet; lo que queda no es programar, es probarlo con huellas de verdad y prepararlo para el vídeo.**

La referencia del flujo es [`MASI_flujos_para_TPO.md`](./MASI_flujos_para_TPO.md), del PO, con sus preguntas respondidas en [`RESPUESTAS_TPO.md`](./RESPUESTAS_TPO.md).

---

## Lo que está vivo

| | |
|---|---|
| App | https://masiapp.vercel.app |
| Demo de passkeys | https://masiapp.vercel.app/passkey-test/ |
| Contrato `escrow` | `CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL` |
| SAC de PEN-test | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |

Comprobado hoy contra producción: `/api/salud` responde `ok`, `/api/solicitudes` responde 200,
`/api/recarga` devuelve saldo, y el bundle publicado lleva dentro el contract ID
—es decir, **la app en producción firma contra el contrato real, no contra la simulación**.

Hashes y reproducción: [`DESPLIEGUE.md`](./DESPLIEGUE.md).

---

## El flujo, paso por paso

Medido contra el diagrama del PO. **En negrita, el tramo que se muestra en vivo.**

| Paso | Contrato | Pantalla |
|---|---|---|
| Registro del técnico | No aplica | ✅ |
| M1 · Cliente publica la solicitud | No aplica | ✅ |
| M2 · Técnico se postula con precio | No aplica | ✅ |
| M3 · Cliente compara y elige | No aplica | ✅ Detalle de solicitud y de propuesta |
| M4–M5 · Visita y cotización final | Dispara `create_job` | ✅ Cotización del técnico |
| **M6 · Pagar** | ✅ `fund` | ✅ |
| **M8–M9 · Iniciar, recibe materiales** | ✅ `start` | ✅ |
| **M10 · Terminar** | ✅ `submit` | ✅ |
| **M11 · Aprobar, o vence el plazo** | ✅ `approve`, `auto_release` | ✅ |
| **M14 · Calificar** | ✅ `rate` | ✅ |
| M12 · Disputa | ✅ `dispute`, `resolve` | 🔶 El cliente y el técnico la abren desde la app; **resolverla es del árbitro y hoy se hace por CLI** |
| Recarga de saldo | `mint` del SAC | ✅ Simulada, acredita de verdad |

---

## Por frente

### P1 — Contrato ✅ completo

22/22 tests. Flujo completo, `rate`, `auto_release` y la disputa verificados en testnet con saldos
reales. `dispute` congela el saldo y bloquea `approve` y `auto_release`; `resolve` reparte solo el
saldo (el adelanto de materiales nunca entra), la comisión va a Masi, y cuenta como trabajo
completado y como disputa en el perfil.

### P2 — Cuentas 🔶

El demo funciona en Android real y vive en el dominio definitivo. La integración está escrita:
`passkeys.ts` expone `connectedAddress()` y `signAndSend()`, y el relayer corre como Function con
su clave solo en el servidor. **Falta lo que nadie puede hacer por código: crear las cuentas de
María y Juan con huella y firmar un trabajo completo.**

### P3 / P4 — Frontend ✅ completo

27 archivos de test, **213 tests en verde**. Pantallas: splash, bienvenida, rol, acceso,
configuración de cliente y de técnico, inicio de ambos, nueva solicitud, detalle de solicitud,
detalle de propuesta, cotización, alertas, actividad, profesionales, perfiles, **pantalla de
trabajo con las seis firmas** y **recarga**.

Los dos problemas del 21 están resueltos: los datos ya son compartidos (API + Upstash Redis, así
que lo que publica María sí llega al teléfono de Juan) y los tests existen.

---

## Cambios respecto al scope

**1. Ofertas para elegir, cotización para pagar.** Las postulaciones sirven para elegir al técnico;
el escrow nace con la **cotización final**, después de la visita. **El contrato no cambia.**

**2. El porcentaje de materiales sale de cada cotización** (opción A del PO): materiales ÷ total,
topado en 50 %.

**3. Tres funciones reciben `caller`** (`cancel`, `dispute`, `auto_release`), porque admiten más de un rol.

**4. La cuenta de comisiones sigue siendo una dirección G** hasta que `passkey-kit` permita
convertirla en smart wallet sin bloquear los fondos.

**5. Hosting en Vercel y un backend mínimo.** Netlify se quedó sin créditos el 21; se migró
**antes de crear ninguna wallet definitiva**, así que no se perdió ninguna passkey. Dominio
congelado: `https://masiapp.vercel.app`. `main` está protegido: todo entra por PR.

**6. Pantalla de recarga simulada.** Era lo último del orden de recorte y entró igual. La emisora
de PEN-test acredita el saldo con un `mint` firmado **en el servidor**; la pantalla lo presenta
como un pago por QR, con el aviso de que es una simulación. En producción esto sería un anchor
por SEP-24, que está fuera del alcance.

---

## Decisiones del PO

- [x] **`dispute` y `resolve`:** se construyen, y `resolve` cuenta como trabajo completado.
- [x] **Hosting:** Vercel, `https://masiapp.vercel.app`.
- [x] **Datos compartidos** con la API del backend (Vercel Functions + Upstash Redis).
- [x] **Plazo de revisión: 24 h** (`review_secs = 86400`).
- [ ] Abiertas, con la recomendación aplicada como valor por defecto: tras publicar, el cliente va
      al **detalle de su solicitud**; comentario de reseña **opcional**; la API **sin
      autenticación**, declarado en el README; la dirección exacta se enseña **solo al técnico
      elegido**.

---

## Lo hecho (cerrado)

- [x] Contrato completo, desplegado y verificado en testnet: flujo feliz, `auto_release` y una disputa 70/30.
- [x] `rate` guardado en storage persistente, no en eventos.
- [x] Migración de Netlify a Vercel, con el dominio congelado.
- [x] Backend mínimo: API de solicitudes, postulaciones y cotizaciones sobre Upstash Redis, funcionando en producción.
- [x] F8: frontend conectado al contrato real, con firma por huella y relayer.
- [x] `develop` → `main` y producción sirviendo la versión buena.
- [x] Pantalla de trabajo con las seis firmas, por rol.
- [x] Pantalla de recarga simulada, con la llave de la emisora solo en el servidor.
- [x] Dirección de la cuenta visible en el perfil, con enlace al explorador.
- [x] 213 tests de frontend y 22 del contrato, todos en verde.

---

## Lo que falta para entregar

Por orden de riesgo. **Nada de esto es programar.**

1. **Un trabajo completo firmado con huella, de principio a fin.** Nunca se ha hecho. Todo lo
   demás está probado por partes; esto es lo único que puede sorprender el día del vídeo.
   Hacerlo hoy, no el 24. Guion paso a paso: [`PRUEBA_E2E.md`](./PRUEBA_E2E.md).
2. **Crear las dos cuentas**, una por teléfono, en `masiapp.vercel.app` (nunca en un preview: la
   llave queda atada al dominio exacto) y recargar saldo **a la del cliente**, que es quien paga.
   No hacen falta los nombres del guion: la cuenta del cliente puede ser la tuya.
3. **Sembrar el historial del técnico** contra su cuenta definitiva, para que su perfil no salga
   vacío en el vídeo. Previsto para el 24, después del punto 2.
4. **Borrar las solicitudes de prueba** de Upstash antes de grabar.
5. **Reescribir el guion del vídeo** con el flujo de ofertas.
6. **Decidir passkeys o fallback** (checkpoint del 23). Depende del punto 1.

**`providers.json` no bloquea nada.** Un técnico que se registra por el camino normal se queda
con su propia dirección y su propio nombre, y la postulación los lleva consigo: el flujo completo
funciona sin tocar ese archivo. Solo alimenta la pantalla de *explorar profesionales*, que es una
vitrina. Si el vídeo la enseña, hay que meter ahí al técnico con su dirección real; si va directo
del problema a las postulaciones, se puede dejar como está.

---

## Si sobrara tiempo

En el orden en que yo los tomaría. Los tres primeros tapan huecos reales; los demás son adorno.

1. **Quién dispara `auto_release`.** Hoy nadie. Si el cliente desaparece, el dinero se queda
   quieto hasta que alguien firme, y en la demo ese alguien somos nosotros. Un **Vercel Cron**
   diario que recorra los trabajos vencidos y los libere lo convierte en lo que el pitch promete:
   *"si no responde en 24 horas, te pagan solo"*. Es media hora de trabajo y es la diferencia
   entre una promesa y una función.
2. **Pantalla del árbitro para `resolve`.** El contrato sabe resolver disputas, pero resolverlas
   hoy exige la CLI. Una pantalla mínima —ver la disputa, mover un deslizador de reparto, firmar—
   cierra el único caso del flujo que no se puede enseñar dentro de la app.
3. **Qué ve el usuario cuando una firma falla.** Si el relayer se cae o cancelan la huella, hay que
   asegurarse de que sale un mensaje en cristiano y el botón vuelve a estar disponible. Es el
   escenario más probable de un directo con wifi de evento.
4. **Notificaciones de verdad** en lugar de la campana decorativa: avisar al técnico de una
   solicitud nueva y al cliente de una postulación.
5. **Buscador y filtros** en la lista de profesionales.
6. **Reintento e idempotencia en la recarga**, para que un doble toque no acredite dos veces.

Lo que **no** haría aunque sobre tiempo: tocar el contrato. Cada función nueva obliga a
redesplegar, cambia el contract ID y arrastra la documentación, el frontend y el historial
sembrado. A tres días de la entrega no compensa.

---

## Riesgos

| Riesgo | Por qué importa |
|---|---|
| **Ninguna firma real todavía** | Es el único punto sin verificar de la cadena completa. Riesgo número uno |
| Perfiles vacíos en el vídeo | El historial de Juan depende de que su cuenta exista antes del 24 |
| Direcciones de relleno en el catálogo | Si se graba sin cambiarlas, el perfil de Juan no enlaza a nada real |
| `auto_release` sin disparador | Se puede enseñar firmándolo a mano, pero la promesa suena automática |
| Wifi del evento | El relayer y el RPC son remotos: conviene tener el vídeo grabado como respaldo |

---

## Checkpoint del 23

- [x] Interfaz del contrato alineada con la ABI real
- [x] Contract ID en testnet
- [x] README con el estado real y el contract ID
- [x] Diagrama de arquitectura → [`ARQUITECTURA.md`](./ARQUITECTURA.md)
- [x] Frontend conectado al contrato y desplegado
- [ ] Decisión sobre passkeys o fallback — depende de la prueba con huella

---

## Documentos

| Archivo | Para qué |
|---|---|
| [`MASI_flujos_para_TPO.md`](./MASI_flujos_para_TPO.md) | Flujo del PO |
| [`RESPUESTAS_TPO.md`](./RESPUESTAS_TPO.md) | Respuestas a las diez preguntas del PO |
| [`ARQUITECTURA.md`](./ARQUITECTURA.md) | Qué vive en la cadena y por qué |
| [`INTEGRACION.md`](./INTEGRACION.md) | Cómo conectar el frontend al contrato |
| [`DESPLIEGUE.md`](./DESPLIEGUE.md) | Contract ID, hashes, reproducción |
| [`PRUEBA_E2E.md`](./PRUEBA_E2E.md) | Prueba de punta a punta con dos teléfonos |
| [`P2_PRUEBA_PASSKEYS.md`](./P2_PRUEBA_PASSKEYS.md) | Cómo probar las passkeys |
| [`masi-scope.md`](./masi-scope.md) | Alcance y cronograma originales |
| [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) | Obligatorio antes de tocar interfaz |
