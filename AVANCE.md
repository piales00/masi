# Estado del proyecto

**Actualizado: 21 de septiembre de 2026, mediodía.** Entrega el 25. Checkpoint el 23.

En una línea: **el contrato está terminado en testnet y el frontend ya cubre la mitad del flujo, pero la parte que usa Stellar —pagar, iniciar, terminar, aprobar, calificar— todavía no tiene ninguna pantalla.**

La referencia del flujo es [`MASI_flujos_para_TPO.md`](./MASI_flujos_para_TPO.md), del PO, con sus preguntas respondidas en [`RESPUESTAS_TPO.md`](./RESPUESTAS_TPO.md).

---

## Lo que ya está vivo

| | |
|---|---|
| App | https://masiapp.vercel.app |
| Demo de passkeys | https://masiapp.vercel.app/passkey-test/ |
| Contrato `escrow` | `CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV` |
| SAC de PEN-test | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |

Hashes y reproducción: [`DESPLIEGUE.md`](./DESPLIEGUE.md).

---

## El flujo, paso por paso

Medido contra el diagrama del PO. **En negrita, el tramo que se propone mostrar en vivo.**

| Paso | Contrato | Pantalla |
|---|---|---|
| Registro del técnico | No aplica | ✅ Configuración, inicio, alertas, actividad y perfil |
| M1 · Cliente publica la solicitud | No aplica | ✅ |
| M2 · Técnico se postula con precio | No aplica | ✅ |
| M3 · Cliente compara y elige | No aplica | ❌ Ninguna pantalla del cliente lee las postulaciones |
| M4–M5 · Visita y cotización final | Dispara `create_job` | ❌ No existe |
| **M6 · Pagar** | ✅ `fund` | ❌ |
| **M8–M9 · Iniciar, recibe materiales** | ✅ `start` | ❌ |
| **M10 · Terminar** | ✅ `submit` | ❌ |
| **M11 · Aprobar, o vence el plazo** | ✅ `approve`, `auto_release` | ❌ |
| **M14 · Calificar** | ✅ `rate` | ❌ |
| M12 · Disputa | ❌ `NotImplemented` | ❌ |

**El frontend no tiene ninguna conexión con la cadena:** no instala `@stellar/stellar-sdk` ni `passkey-kit`, y `dataSource.ts` sigue apuntando a datos de prueba.

---

## Por frente

### P1 — Contrato ✅ salvo la disputa

17/17 tests. Flujo completo, `rate` y `auto_release` verificados en testnet.

`dispute` y `resolve` siguen en `NotImplemented`. El PO pide no recortarlos, y tiene razón: sin `dispute`, `auto_release` le paga al técnico aunque el cliente no apruebe, y el cliente no tiene cómo frenarlo.

### P2 — Cuentas 🔶

Funciona en un Android real y el demo ya está en el dominio bueno (`/passkey-test/`). Falta crear las wallets de María y Juan ahí e integrar el relayer. Tarea: [`TAREA_PASSKEYS_DOMINIO.md`](./TAREA_PASSKEYS_DOMINIO.md).

### P3 / P4 — Frontend 🔶

Avanzó mucho: el técnico ya no es un muro, tiene su propio recorrido completo hasta postularse. Pantallas: splash, bienvenida, rol, acceso, configuración de cliente y de técnico, inicio de cliente y de técnico, nueva solicitud, alertas, actividad, profesionales y perfiles.

Dos problemas:

- **Los datos viven en el `localStorage` del navegador.** Lo que publica María en su teléfono no llega al de Juan. Solo funciona con los dos roles en el mismo navegador.
- **No hay tests del frontend.** `npm test` responde "No test files found", y nunca hubo archivos de test en git: hay que escribirlos, no recuperarlos. El build sí compila.

---

## Cambios respecto al scope

**1. Ofertas para elegir, cotización para pagar.** El PO separa dos momentos: las postulaciones sirven para elegir al técnico, y el escrow nace con la **cotización final**, después de la visita. `create_job` se llama entonces. **El contrato no cambia.**

**2. El porcentaje de materiales sale de cada cotización** (opción A del PO): materiales ÷ total. Topado en 50 %; si se pasa, el técnico pone la diferencia.

**3. Tres funciones reciben `caller`** (`cancel`, `dispute`, `auto_release`), porque admiten más de un rol.

**4. La cuenta de comisiones sigue siendo una dirección G** hasta que `passkey-kit` permita convertirla en smart wallet sin bloquear los fondos.

**5. Hosting en Vercel y un backend mínimo.** El 21 Netlify se quedó en 30 de 300 créditos (cada despliegue a producción cuesta 15) y el período no se renueva hasta el 19 de octubre. Se migró a Vercel Hobby **antes de crear ninguna wallet definitiva**, así que el cambio de dominio no rompió nada. El dominio congelado es ahora `https://masiapp.vercel.app`. `main` está protegido por un ruleset: todo entra por PR. El modelo de ofertas necesita datos compartidos antes del contrato, así que se añade un backend mínimo (Vercel Functions + Vercel Blob), aunque el scope original decía "sin backend propio".

---

## Tareas para encargar hoy

Ordenadas por dependencia: las de arriba desbloquean las de abajo. El detalle para cada programador está en `TAREAS_21SEP_BACKEND.md` y `TAREAS_21SEP_FRONTEND.md` (PR #4).

### 0. Decidir, antes de repartir nada

- [ ] **¿Se construye `dispute`?** Recomendación: sí. **Añadirlo cambia el contract ID**, porque el contrato no tiene función de actualización. Si se hace después de conectar el frontend o de sembrar el día 24, se pierde ese trabajo.
- [x] **Hosting:** Vercel, `https://masiapp.vercel.app`.
- [ ] **¿Almacén compartido o demo en un solo dispositivo?** Recomendación: Vercel Blob detrás de una Vercel Function.
- [ ] **Plazo de revisión por defecto.** Recomendación: 72 h.

### P1 — Contrato

- [ ] **`dispute` y `resolve`**, con tests (~3 h). `dispute` pasa a `Disputed`, que ya bloquea `approve` y `auto_release` por sí solo. `resolve` reparte solo el saldo según `provider_bps`, la comisión va a Masi y suma una disputa al perfil.
- [ ] Redesplegar y actualizar el ID en `CLAUDE.md`, `INTEGRACION.md`, `DESPLIEGUE.md` y el README. **Antes** de que el frontend se conecte.

### P2 — Cuentas

- [ ] Wallets de María y Juan en `masiapp.vercel.app`, con huella real.
- [ ] Relayer en una Vercel Function. La clave nunca en el bundle.

### P3 / P4 — Frontend

- [ ] **Cliente ve las postulaciones y elige una** (M3). Los datos ya existen: `postulaciones` en `DemoContext`.
- [ ] **Cotización final** (M4–M5). El técnico carga total y monto de materiales; el cliente la ve y acepta. Ese botón dispara `create_job`.
- [ ] **Pantalla de trabajo, una por rol,** con los cinco botones de firma: pagar, iniciar, terminar, aprobar y calificar. Se puede empezar hoy contra los 9 estados de `shared/escrow.ts` con datos de prueba y conectar después.
- [ ] **Almacén compartido** para solicitudes, postulaciones, cotizaciones y texto de reseñas, si se decide en el punto 0.
- [ ] Escribir los tests del frontend.

### Después de lo anterior

- [ ] Conectar `dataSource.ts` y la pantalla de trabajo al contrato → [`INTEGRACION.md`](./INTEGRACION.md). Espera al redespliegue de P1.
- [ ] Reescribir el guion del vídeo con el flujo del PO.
- [ ] 24: sembrar el historial de Juan **contra su wallet definitiva**.

---

## Riesgos

| Riesgo | Por qué importa |
|---|---|
| **El tramo con Stellar no tiene pantallas** | Es lo único que se muestra en vivo y lo que evalúa el track. A 4 días de la entrega, es el riesgo mayor |
| Redesplegar después de conectar | Cambia el contract ID y rompe todo lo conectado. Hay que decidir `dispute` hoy |
| Datos solo en el navegador | Con dos teléfonos, el técnico no ve lo que publica el cliente |
| Perfiles vacíos en el vídeo | El historial de Juan depende de que su wallet exista antes del 24 |
| Passkeys | Decisión el 22 por la noche; fallback a Blux definido |

---

## Checkpoint del 23

- [x] Interfaz del contrato — alineada con la ABI real
- [x] Contract ID en testnet
- [x] README con el estado real y el contract ID
- [x] Diagrama de arquitectura → [`ARQUITECTURA.md`](./ARQUITECTURA.md)
- [ ] Decisión sobre passkeys o fallback — el 22 por la noche

Si se redespliega por `dispute`, el ID del checkpoint cambia; hay que entregar el nuevo.

---

## Documentos

| Archivo | Para qué |
|---|---|
| [`MASI_flujos_para_TPO.md`](./MASI_flujos_para_TPO.md) | Flujo del PO: proceso actual, flujo de MASI, decisiones |
| [`RESPUESTAS_TPO.md`](./RESPUESTAS_TPO.md) | Respuestas a las diez preguntas del PO |
| [`ARQUITECTURA.md`](./ARQUITECTURA.md) | Qué vive en la cadena y por qué |
| [`INTEGRACION.md`](./INTEGRACION.md) | Cómo conectar el frontend al contrato |
| [`DESPLIEGUE.md`](./DESPLIEGUE.md) | Contract ID, hashes, reproducción |
| [`TAREA_PASSKEYS_DOMINIO.md`](./TAREA_PASSKEYS_DOMINIO.md) | Tarea abierta de P2 |
| [`masi-scope.md`](./masi-scope.md) | Alcance y cronograma originales |
| [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) | Obligatorio antes de tocar interfaz |
