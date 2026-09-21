# Tareas del 21 de septiembre — Frontend

**Resumen.** Hoy cierras el recorrido que falta entre "el técnico se postula" y "el cliente califica": el cliente ve las postulaciones y elige (M3), el técnico envía la cotización final y el cliente la acepta, lo que dispara `create_job` (M4–M5), y la **pantalla de trabajo**, una por rol, con las firmas del tramo que se muestra en vivo. Todo se construye hoy contra datos de prueba, con la misma forma que el contrato y que la API, y se conecta después. La API del almacén la define el backend en un solo sitio: [la sección 2 de `TAREAS_21SEP_BACKEND.md`](./TAREAS_21SEP_BACKEND.md#2-la-api-del-almacén--el-punto-de-integración). Aquí se enlaza, no se repite.

---

## 0. Antes de empezar

### Lee

- [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) antes de tocar cualquier pantalla. Los tokens ya están en Tailwind (`bg-masi-blue`, `text-masi-navy`, `rounded-masi-card`…). Reutiliza `Button`, `Field`, `Screen`, `ScreenHeader` y `ScreenFooter` de `frontend/src/components/`.
- [`INTEGRACION.md`](./INTEGRACION.md): montos, tipos y la tabla de errores del contrato.
- [`RESPUESTAS_TPO.md`](./RESPUESTAS_TPO.md), sección "Sobre la propuesta de la sección 4": la secuencia de firmas.
- La API del almacén: [sección 2 del documento del backend](./TAREAS_21SEP_BACKEND.md#2-la-api-del-almacén--el-punto-de-integración). Los tipos se importan de `shared/api.ts` (lo publica el backend en B1, antes de las 11:00).

### Reglas de todas las pantallas

- **En la interfaz nunca aparecen** *wallet*, *XLM*, *gas* ni *seed phrase*. Tampoco "stroops", ni hashes en primer plano: el hash va en una sección secundaria "Ver detalles".
- **Montos siempre en soles.** El contrato usa stroops con 7 decimales: S/1.200 = `12000000000n`. En código son `bigint` y en la API son `string`. Nunca `number` para dinero que llega al contrato.
- **Cada firma se presenta como "Confirma con tu huella"**, incluida la del técnico en `accept`: ya cotizó, así que no es otra negociación.
- **Los errores del contrato se traducen a frases** (F1). El usuario nunca ve `Error(Contract, #4)`.
- Contraste AA, estados con icono y texto (nunca solo color), sin texto blanco sobre naranja y sin texto naranja pequeño.

### Git

- `main` está protegido: todo entra por PR, y **cada merge a `main` es un despliegue de producción**. En Netlify quedan dos, sin renovación hasta el 19 de octubre.
- Trabaja en ramas cortas (`feat/pantalla-trabajo`, `feat/m3-elegir`, `feat/cotizacion`) con PR contra **`develop`**. `develop` → `main` se mergea agrupado, como mucho una vez al día.
- Los commits y los PR no llevan `Co-Authored-By` ni líneas de atribución.

### Decisiones abiertas que te afectan

| # | Decisión | Te bloquea |
|---|---|---|
| **(a)** | Hosting: Netlify Personal o Vercel Hobby | F5 (probar contra la API desplegada) y F7 |
| **(b)** | ¿Se construye `dispute`? Cambia el contract ID | F8 (conectar al contrato), que no es de hoy |
| **(c)** | Plazo de revisión por defecto (recomendado 72 h) | Solo el valor de `DEFAULT_REVIEW_SECS` |

### Orden y línea de corte

```
F1 base ──► F2 M3 ──► F3 cotización ──► F4 pantalla de trabajo
                         └──────────────► F5 persistencia en la API 🔒a
F6 tests (a lo largo del día)     F7 vercel.json 🔒a     F8 conectar al contrato (22) 🔒b
```

**F4 es la prioridad del día**: es el tramo que se muestra en vivo y hoy no tiene ninguna pantalla. No depende de F2 ni de F3, así que, si a mediodía vas atrasado, haz F4 antes que F2 y F3. Si a las 18:00 no llegaste a F5, pasa al 22 a primera hora. Suma estimada de hoy: unas 14 h. No cabe entera, y está ordenada para que lo que quede fuera sea lo último.

---

## 1. Tareas

### F1 · Base: configuración, soles y errores del contrato

**Objetivo.** Tener en un solo sitio las constantes de la red y del contrato, la conversión soles ↔ stroops y la traducción de errores, para que ninguna pantalla lo reinvente.

**Por qué importa.** Las tres pantallas siguientes muestran dinero y errores. Un redondeo distinto entre la pantalla y el contrato hace que el cliente vea S/360 de adelanto y el contrato entregue otra cifra.

**Archivos.**
- Nuevo: `frontend/src/config.ts`: `CONTRACT_ID` (hoy `CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV`; cambia si se hace B3), `PEN_SAC_ID`, `RPC_URL`, `NETWORK_PASSPHRASE` y `EXPLORER_TX = 'https://stellar.expert/explorer/testnet/tx/'`. `FEE_BPS`, `MAX_MATERIALS_BPS` y `DEFAULT_REVIEW_SECS` se reexportan de `shared/api.ts`, no se duplican. **Es el único archivo que toca el backend cuando cambie el ID.**
- Nuevo: `frontend/src/money.ts`:
  - `solesToStroops(input: string): bigint`: acepta `"1200"` o `"1200.5"` (máximo 2 decimales) y lanza error si no. **Sin pasar por `number`.**
  - `formatSoles(stroops: bigint): string`, con el mismo formato que `formatPrice` de `frontend/src/marketplace.ts` (`S/ 1,200`).
  - `portion(amount: bigint, bps: number): bigint`: **la misma fórmula que el contrato** (`contracts/escrow/src/lib.rs`, líneas 372-384: `(a / 10000n) * bps + (a % 10000n) * bps / 10000n`).
  - `materialsBpsOf(total: bigint, materiales: bigint): number`: `min(floor(materiales * 10000 / total), 5000)`.
- Nuevo: `frontend/src/contractErrors.ts`: `friendlyError(err: unknown): string`. Reconoce `Error(Contract, #N)` y usa la tabla de `INTEGRACION.md`. Esa tabla no cubre todos los códigos que hay en `contracts/escrow/src/types.rs`; para los que faltan:
  - #9 `InvalidDescription` → "La descripción es muy larga."
  - #10 `InvalidParties` → "No puedes contratarte a ti mismo."
  - #1, #2, #8, #11, #14 → "Algo salió mal. Inténtalo de nuevo."
  - Huella cancelada (`DOMException` con `name === 'NotAllowedError'`) → "No se confirmó tu huella. Inténtalo de nuevo."
  - Cualquier otra cosa → "Algo salió mal. Inténtalo de nuevo."
- Nuevos: `frontend/src/money.test.ts` y `frontend/src/contractErrors.test.ts`.

**Criterios de aceptación.**
- [ ] `solesToStroops("1200") === 12000000000n` y `solesToStroops("0.01") === 100000n`; `"1.234"`, `"-5"` y `"abc"` lanzan error.
- [ ] Caso del vídeo: total S/1.200 con materiales S/360 → `materialsBpsOf` = 3000, `portion(total, 3000)` = S/360, comisión `portion(total, 500)` = S/60, total a pagar S/1.260.
- [ ] Materiales S/700 sobre un total de S/1.200 → 5000 bps (tope) y adelanto de S/600.
- [ ] `friendlyError(new Error('HostError: Error(Contract, #4)'))` → "Este trabajo ya avanzó. Actualiza la página."
- [ ] `npm test` deja de decir "No test files found" y pasa.

**Depende de.** Nada; si `shared/api.ts` aún no está, deja las tres constantes en `config.ts` y muévelas al llegar B1. **Estimación:** 1,5 h.

---

### F2 · M3: el cliente ve las postulaciones y elige una

**Objetivo.** Que el cliente vea sus solicitudes, las propuestas que recibió cada una y elija un técnico.

**Por qué importa.** Hoy `postulaciones` existe en `DemoContext` pero ninguna pantalla del cliente la lee: el flujo se corta justo después de que el técnico se postula (M2). Sin M3 no hay a quién pedirle la cotización.

**Archivos.**
- `frontend/src/App.tsx`, línea 67: sustituir el `SoonScreen` de `/solicitudes` por `RequestsScreen` y añadir `/solicitudes/:id` → `RequestDetailScreen`, dentro del grupo `RequireProfile`. Ojo: `/solicitudes/nueva` tiene que seguir declarada antes que `:id` o quedar como ruta estática; React Router 7 da prioridad a la estática, pero compruébalo.
- Nuevos: `frontend/src/screens/RequestsScreen.tsx` y `frontend/src/screens/RequestDetailScreen.tsx`.
- `frontend/src/demo/DemoContext.tsx`: añadir `chooseProposal(solicitudId, postulacionId): Promise<Solicitud>`, con la transición de la [sección 2.4 del backend](./TAREAS_21SEP_BACKEND.md#24-transiciones-que-aplica-el-servidor), y ampliar `Solicitud` y `Postulacion` a los tipos de `shared/api.ts`: `clienteId`, `postulacionElegidaId`, `providerNombre`, `providerAddress`… **Escribe las funciones nuevas como `async` desde ya**, aunque hoy lean de `localStorage`: así F5 solo cambia la implementación.
- `frontend/src/screens/ProviderAlertScreen.tsx`, línea 35: `sendProposal` pasa a enviar también `providerNombre` (de `providerProfile.fullName`) y `providerAddress` (de `providers.json` si el `id` coincide; si no, `null`).
- `frontend/src/screens/NewRequestScreen.tsx`, línea 132: tras publicar, navegar a `/solicitudes/${solicitud.id}` ("Esperando propuestas") en lugar de `/profesionales?servicio=…`. En el flujo del PO, después de publicar se espera a los técnicos (M2); no se busca a mano.
- `clienteId`: hasta que exista la dirección `C…` de María, un UUID guardado en `localStorage` (`masi.demo.clienteId.v1`) que se crea al guardar o abrir el perfil de cliente.

**Qué muestra.**
- Lista: cada solicitud con su servicio, descripción corta, fecha y un chip de estado con texto: "Esperando propuestas", "Elegiste a Juan", "Cotización recibida" o "Contratado".
- Detalle: la solicitud arriba y debajo las postulaciones. Cada una lleva nombre, precio referencial (`formatPrice`), "Llega en 40 min" y la calificación si `providerId` está en `providers.json` (vía `useMarketplace`; si no hay reseñas, "Sin reseñas"; si el técnico no está en el catálogo, "Nuevo en Masi"). Botón "Elegir a Juan".
- Una vez elegido: las demás postulaciones se atenúan y aparece el aviso "Elegiste a Juan. Te visitará y te enviará la cotización final."
- Del lado del técnico, en `frontend/src/screens/ProviderActivityScreen.tsx` (línea 139, el chip fijo "Enviada"), el chip se deriva: "Te eligieron", "Eligieron a otro profesional" o "Enviada".

**Criterios de aceptación.**
- [ ] Con los dos roles en el mismo navegador: María publica, Juan se postula y María ve la postulación de Juan en `/solicitudes/:id` sin recargar a mano.
- [ ] Elegir cambia la solicitud a `profesional_elegido` y deshabilita los otros botones "Elegir".
- [ ] El técnico ve "Te eligieron" en Actividad.
- [ ] Una solicitud sin postulaciones muestra un estado vacío claro, no una lista en blanco.
- [ ] Móvil a 360 px sin scroll horizontal; checklist de la sección 13 de `STYLE_GUIDE.md`.

**Depende de.** F1 y, para los tipos, B1 del backend. **Estimación:** 2 h.

---

### F3 · M4–M5: cotización final y `create_job`

**Objetivo.** El técnico elegido carga el total y el monto de materiales; el cliente ve el desglose y, al aceptar, firma `create_job`.

**Por qué importa.** Es el cambio clave del PO: el escrow nace con la cotización final, no con la oferta. Es el paso que convierte una solicitud en un trabajo con dinero protegido.

**Archivos.**
- Nuevo: `frontend/src/screens/ProviderQuoteScreen.tsx`, en la ruta `/profesional/cotizacion/:solicitudId` (grupo `RequireProviderProfile` de `App.tsx`). Se llega desde el botón "Enviar cotización final" de Actividad cuando el chip dice "Te eligieron".
- `frontend/src/screens/RequestDetailScreen.tsx` (de F2): tarjeta de cotización cuando la solicitud está `cotizada`.
- `frontend/src/demo/DemoContext.tsx`: `cotizaciones: Cotizacion[]`, `sendQuote(input: CotizacionInput)`, `acceptQuote(id, jobId, txHash)` y `rejectQuote(id)`, todas `async`. Tipos de `shared/api.ts`.
- Nuevo: `frontend/src/escrow/` (la interfaz y el mock se describen en F4). F3 solo usa `escrow.createJob`.

**Formulario del técnico.**
- "Total del trabajo (S/)", "Materiales a comprar (S/)" y "Descripción", precargada con `solicitud.descripcion`. Máximo 1024 bytes: mídelos con `new TextEncoder().encode(texto).length`, no con `.length`.
- Resumen en vivo, calculado con `money.ts`:
  - "Al iniciar recibes **S/360** para materiales."
  - "Al aprobar el cliente, recibes **S/840**."
  - "Masi le cobra al cliente S/60 de comisión. Tú recibes el total."
- Si los materiales pasan del 50 %, aviso (texto navy sobre crema, con icono, **no** texto naranja): "El adelanto máximo es el 50 % (S/600). Los S/100 restantes los pones tú y los recuperas al aprobar." **No es un error**: la cotización se puede enviar.
- Validación: total > 0 y materiales entre 0 y el total. Si el técnico no tiene dirección `C…`, botón deshabilitado con el mensaje "Termina de crear tu cuenta para enviar cotizaciones".
- Los montos se muestran con `portion(total, materialsBps)`, **el valor que calculará el contrato**, no con la cifra tecleada.

**Tarjeta del cliente.**
- Total S/1.200 · "Materiales, se entregan al iniciar: S/360" · "Comisión Masi (5 %): S/60" · **"Pagarás S/1.260"**.
- Una línea sobre la protección: "Tu dinero queda protegido. Juan recibe el resto cuando apruebes el trabajo, o 72 horas después de que lo marque como terminado si no respondes." Las horas salen de `reviewSecs`.
- Botón primario "Aceptar cotización" → "Confirma con tu huella" → `escrow.createJob({ client, provider: providerAddress, amount: BigInt(totalStroops), materials_bps, fee_bps, review_secs: BigInt(reviewSecs), description })` → `acceptQuote(id, String(jobId), hash)` → navegar a `/trabajos/:jobId`.
- Antes de firmar, avisa de lo que viene: "Juan confirmará y luego pagas." El cliente firma dos veces con el técnico en medio (`create_job`, `accept` del técnico, `fund`), porque el contrato no deja pagar un trabajo que el técnico no confirmó.
- Botón secundario "Rechazar" → `rejectQuote`; el técnico puede volver a cotizar.

**Un caso que no puede fallar.** Si `createJob` va bien pero `acceptQuote` falla (red, API caída), **no vuelvas a llamar a `create_job`**: crearía un segundo trabajo. Guarda `{ cotizacionId, jobId, txHash }` en `localStorage` (`masi.demo.aceptacionPendiente.v1`) antes de llamar a la API, y reintenta solo el `PATCH` al volver a la pantalla.

**Criterios de aceptación.**
- [ ] Caso del vídeo de punta a punta contra el mock: Juan cotiza S/1.200 con S/360 de materiales, María ve "Pagarás S/1.260", acepta, y el mock recibe `amount = 12000000000n`, `materials_bps = 3000` y `fee_bps = 500`.
- [ ] Con materiales de S/700 sobre S/1.200 aparece el aviso del tope y se envía `materials_bps = 5000`.
- [ ] Un error del mock `Error(Contract, #7)` muestra "El adelanto no puede pasar del 50%."
- [ ] Rechazar deja al técnico volver a cotizar.
- [ ] Simular un fallo de `acceptQuote` después de `createJob` y comprobar que al reintentar **no** se crea un segundo trabajo.

**Depende de.** F1, F2 y la interfaz `EscrowGateway` de F4 (defínela primero, aunque sea vacía). **Estimación:** 3 h.

---

### F4 · Pantalla de trabajo, una por rol

**Objetivo.** Una pantalla que, según el estado del trabajo y el rol, muestre qué pasa y ofrezca la única acción que toca: pagar (`fund`), iniciar (`start`), terminar (`submit`), aprobar (`approve`), calificar (`rate`) y la confirmación del técnico (`accept`).

**Por qué importa.** Es **todo** el tramo que se muestra en vivo (M6 a M14) y hoy no tiene ni una pantalla. Es el riesgo mayor de `AVANCE.md`. Se construye ya contra los 9 estados de `shared/escrow.ts` con un mock, y el 22 se cambia el mock por el contrato sin tocar la pantalla.

**Archivos.**
- Nuevo: `frontend/src/escrow/gateway.ts`, con la interfaz `EscrowGateway`. Los argumentos salen de `EscrowArguments` de `shared/escrow.ts`:
  ```ts
  getJob(jobId: bigint): Promise<Job>;
  createJob(args: EscrowArguments['create_job']): Promise<{ jobId: bigint; hash: string }>;
  accept(jobId: bigint): Promise<{ hash: string }>;
  fund(jobId: bigint): Promise<{ hash: string }>;
  start(jobId: bigint): Promise<{ hash: string }>;
  submit(jobId: bigint): Promise<{ hash: string }>;
  approve(jobId: bigint): Promise<{ hash: string }>;
  autoRelease(jobId: bigint, caller: string): Promise<{ hash: string }>;
  rate(jobId: bigint, stars: number, commentHash: Uint8Array): Promise<{ hash: string }>;
  ```
- Nuevo: `frontend/src/escrow/mockEscrow.ts`. Guarda los `Job` en `localStorage` (`masi.demo.trabajos.v1`, con los `bigint` como string). Reproduce las reglas del contrato: estado requerido de cada función, montos con `portion`, `remaining_amount`, `submitted_at` y el plazo de `auto_release`, `rated` una sola vez, estrellas de 1 a 5. Cuando la regla no se cumple, lanza `new Error('Error(Contract, #N)')` con el código real, para ejercitar `friendlyError`. Siembra los trabajos `901`–`909`, uno por estado, para revisar cada vista.
- Nuevo: `frontend/src/escrow/index.ts`: `export const escrow: EscrowGateway = mockEscrow;`. Mismo patrón que `frontend/src/dataSource.ts`: el 22 solo cambia esta línea.
- Nuevo: `frontend/src/screens/JobScreen.tsx` con `role: 'client' | 'provider'`. Rutas en `App.tsx`: `/trabajos/:jobId` (grupo cliente) y `/profesional/trabajos/:jobId` (grupo técnico).
- Se llega desde la solicitud `contratada` (cliente) y desde Actividad cuando la cotización está `aceptada` (técnico).

**Qué muestra cada estado.** Una acción principal por pantalla; el resto es información.

| Estado | Cliente | Técnico |
|---|---|---|
| `Requested` | "Esperando que Juan confirme" | **"Confirma con tu huella"** → `accept`. Recuerda el total que cotizó |
| `Accepted` | **"Pagar S/1.260 protegido"** → `fund`, con el desglose total + comisión | "María está pagando" |
| `Funded` | "Tu pago está protegido. Juan puede empezar." | "Pago asegurado" + **"Iniciar trabajo"** → `start`: "Recibirás S/360 para materiales" |
| `Started` | "Juan está trabajando. Ya recibió S/360 para materiales." | **"Marcar como terminado"** → `submit` |
| `Submitted` | **"Aprobar y liberar el pago"** → `approve`, con "Si no respondes, el pago se libera el {fecha}" (`submitted_at + review_secs`) | "Esperando la aprobación de María. Se libera sola el {fecha}" |
| `Submitted`, plazo vencido | "Liberar pago" → `autoRelease(jobId, miDirección)` | "Liberar mi pago" → `autoRelease(jobId, miDirección)` |
| `Released` | Si `!rated`: **calificar** (1 a 5 estrellas y comentario opcional) → `rate`. Si ya calificó: sus estrellas | "Pago recibido: S/1.200" (materiales + saldo) |
| `Disputed` | "Estamos revisando este trabajo" | Igual |
| `Resolved` | Reparto final y, si `!rated`, calificar | Reparto final |
| `Cancelled` | "Trabajo cancelado" y el reembolso, si lo hubo | "Trabajo cancelado" |

Montos siempre desde el `Job` (`amount`, `fee_amount`, `materials_amount` y `remaining_amount`), formateados con `formatSoles`. Nunca recalculados a mano.

**Calificar, en este orden.**
1. `hash = SHA-256(texto)` con `crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))`, como `Uint8Array` de 32 bytes.
2. Si hay texto: `PUT /api/resenas/:jobId` con el `hash` en hex (forma exacta en la [sección 2.3 del backend](./TAREAS_21SEP_BACKEND.md#23-endpoints)). Hasta F5, en `localStorage`.
3. `escrow.rate(jobId, estrellas, hash)`.

Se guarda el texto **antes** de firmar: si falla la firma, queda un texto huérfano sin efecto; al revés, quedaría un hash en la cadena sin texto que lo respalde. Con el comentario vacío se firma el hash de `""` y no se guarda nada.

**Siempre.**
- Botón en estado "Confirmando…" y deshabilitado mientras se firma y envía. Nada de doble envío.
- Tras cada acción, relee con `getJob` y además refresca cada 5 s con la pestaña visible, para ver lo que firma la otra persona.
- Sección plegable **"Ver detalles"** con el número de trabajo y el enlace `EXPLORER_TX + hash` de la última acción. Es el único sitio donde aparece un hash.
- Errores con `friendlyError`, en un aviso con icono bajo el botón.
- Carga con *skeletons* grises, no spinners largos.

**Criterios de aceptación.**
- [ ] `/trabajos/901` … `/trabajos/909` y sus equivalentes de técnico muestran la vista correcta de cada estado.
- [ ] Flujo completo con el mock y los dos roles en el mismo navegador: `accept` → `fund` → `start` → `submit` → `approve` → `rate`, cada botón solo visible para quien le toca.
- [ ] Pulsar `approve` dos veces seguidas no provoca dos llamadas.
- [ ] Forzar `Error(Contract, #15)` muestra "Ya calificaste este trabajo."
- [ ] `auto_release` solo se ofrece con el plazo vencido. Si el mock responde #12, "Todavía estás a tiempo de revisar el trabajo."
- [ ] `grep -rniE "wallet|xlm|\bgas\b|seed phrase|stroop" frontend/src/screens` no devuelve nada visible para el usuario.
- [ ] Móvil a 360 px; checklist de la sección 13 de `STYLE_GUIDE.md`.

**Depende de.** F1. **No** depende de F2 ni de F3. **Estimación:** 4 h.

---

### F5 · Persistencia de `DemoContext` en la API compartida 🔒 decisión (a) para probar desplegado

**Objetivo.** Que solicitudes, postulaciones, cotizaciones y reseñas se lean y escriban en la API del almacén, para que lo que publica María en su teléfono le llegue a Juan en el suyo.

**Por qué importa.** Es lo que permite grabar el vídeo con dos teléfonos, uno por rol. Hoy todo vive en `localStorage` y solo funciona en un mismo navegador.

**La API está definida en [la sección 2 del documento del backend](./TAREAS_21SEP_BACKEND.md#2-la-api-del-almacén--el-punto-de-integración).** Usa los tipos de `shared/api.ts`. Si algo no te cuadra, se cambia allí y en `shared/api.ts` en el mismo PR, avisando al backend; nunca en una copia local.

**Archivos.**
- Nuevo: `frontend/src/api/client.ts`: un `fetch` tipado por endpoint (`listSolicitudes`, `createSolicitud`, `elegir`, `listPostulaciones`, `createPostulacion`, `listCotizaciones`, `createCotizacion`, `patchCotizacion`, `getResena`, `putResena`), que lanza con el `ApiError` recibido.
- Nuevo: `frontend/src/usePolling.ts`: repite una carga cada 10 s y se detiene con `document.hidden`. En Netlify cada invocación gasta créditos.
- `frontend/src/demo/DemoContext.tsx`: `publishRequest`, `sendProposal`, `chooseProposal`, `sendQuote`, `acceptQuote`, `rejectQuote` y `saveReview` delegan en `api/client.ts`. `solicitudes`, `postulaciones` y `cotizaciones` se cargan con `usePolling`. **Los perfiles y la sesión siguen en `localStorage`**: no son compartidos.
- Selector `VITE_STORE=api|local` (no es un secreto, puede ser `VITE_`). `local` conserva el comportamiento actual: es el plan B si la API no llega, con el vídeo en un solo dispositivo.
- Llamadas que pasan a `await`, con el botón deshabilitado mientras envía y un mensaje de error: `NewRequestScreen.tsx`, línea 124 (`publishRequest`), y `ProviderAlertScreen.tsx`, línea 35 (`sendProposal`), además de las pantallas nuevas de F2 a F4. Lectores que tienen que tolerar el estado de carga: `ProviderHomeScreen.tsx` (líneas 20-21) y `ProviderActivityScreen.tsx` (línea 13).

**Criterios de aceptación.**
- [ ] Dos navegadores distintos (o un teléfono y un portátil) contra la API desplegada: María publica y Juan la ve en sus alertas en 10 s como mucho; Juan se postula y María lo ve en su detalle.
- [ ] Con `VITE_STORE=local`, todo sigue funcionando como hoy.
- [ ] Una API caída muestra "Algo salió mal. Inténtalo de nuevo." con botón de reintento, no una pantalla en blanco.
- [ ] Ningún `bigint` pasa por `JSON.stringify`: el dinero viaja como `string`.

**Depende de.** B1, y B4b desplegado para la prueba entre dispositivos. Antes de B4b se puede probar en local con `netlify dev` o `vercel dev` sobre la rama del backend. **Estimación:** 2,5 h.

---

### F6 · Tests del frontend

**Objetivo.** Que `npm test` vuelva a ser una red de seguridad.

**Por qué importa.** Hoy `npm test` responde "No test files found" y termina con error, aunque el README lo da como verificación. En el historial de git **nunca hubo tests del frontend commiteados**: `vite.config.ts` apuntaba a un `src/test/setup.ts` que no llegó a entrar en el repo. No hay nada que recuperar: hay que escribirlos.

**Archivos.** `frontend/src/money.test.ts` y `frontend/src/contractErrors.test.ts` (F1), y además:
- `frontend/src/marketplace.test.ts`: `parseRatingSummary` (incluido el rechazo de `rating_count > completed_jobs`), `selectProviders`, `formatRating` con cero reseñas ("Sin reseñas").
- `frontend/src/escrow/mockEscrow.test.ts`: cada función exige su estado, montos al stroop y `rate` una sola vez.
- `frontend/src/screens/JobScreen.test.tsx`: con `@testing-library/react` (ya instalado; `jest-dom` no, así que usa aserciones simples), el botón correcto por estado y rol.

**Criterios de aceptación.**
- [ ] `cd frontend && npm test && npm run build` pasan.
- [ ] Al menos un test por archivo nuevo de F1 y F4.

**Depende de.** F1 y F4. **Estimación:** 1,5 h, repartida a lo largo del día.

---

### F7 · `vercel.json` con la regla SPA 🔒 decisión (a), solo si se mudan a Vercel

**Objetivo.** Que un refresco en una ruta interna (`/solicitudes/abc`) sirva la app en Vercel, como hoy hace `frontend/public/_redirects` en Netlify.

**Archivos.** Nuevo: `frontend/vercel.json` (el Root Directory del proyecto en Vercel es `frontend`, tarea B7 del backend):

```json
{
  "rewrites": [
    { "source": "/((?!api/|passkey-test/).*)", "destination": "/index.html" }
  ]
}
```

Deja `_redirects` hasta que Netlify se apague: en Vercel no molesta.

**Criterios de aceptación.**
- [ ] Refrescar `/solicitudes/abc` y `/profesional/actividad` carga la app.
- [ ] `/api/salud` devuelve JSON, no `index.html`.
- [ ] `/passkey-test/` sigue cargando el demo de passkeys.

**Depende de.** Decisión (a) y B7. **Estimación:** 0,25 h.

---

### F8 · Conectar al contrato — el 22, no hoy 🔒 decisión (b)

Para que no te pille por sorpresa: el 22 se escribe `frontend/src/escrow/contractEscrow.ts` siguiendo [`INTEGRACION.md`](./INTEGRACION.md) (`contract.Client.from`, firma con `passkey-kit` y envío por `POST /api/relayer`, sección B5a del backend), se cambia la línea de `frontend/src/escrow/index.ts` y la de `frontend/src/dataSource.ts` (`contractRatingSource`), y se pone la dirección real de Juan en `frontend/src/data/providers.json` (hoy es un marcador, `CAAQ…C526`).

**Espera a** que exista el contract ID definitivo (B3, si se hace `dispute`), a que el relayer esté desplegado (B5b) y a que existan las wallets de María y Juan (B6). Conectar antes significa rehacerlo si cambia el ID. **Estimación:** 4 h, el 22.

---

## 2. Decisiones que necesito del PO

1. **(a) Hosting**, hoy: define si F5 se prueba contra Netlify o Vercel y si hay F7.
2. **(b) `dispute`**: si se construye, el contract ID cambia y F8 espera al redespliegue. Confirmar además si el cliente debe ver un botón "Tengo un problema" (`dispute`) en la pantalla de trabajo, en `Started` y `Submitted`. Hoy no está en la lista; es 1 h más.
3. **(c) Plazo de revisión**: el texto "se libera el {fecha}" y la línea de protección de la cotización dependen de ese valor.
4. **Después de publicar, ¿el cliente va al detalle de su solicitud o al listado de profesionales?** Propuesta: al detalle (F2), que es lo que dice el flujo del PO. Hoy va al listado.
5. **Comentario de la reseña opcional u obligatorio.** Propuesta: opcional (F4). Es lo tercero en el orden de recorte de `CLAUDE.md`.
