# Tareas del 23 de septiembre — fotos compartidas y panel del árbitro

**Entrega el 25.** Dos frentes, tres personas. Todo entra por rama y PR a `develop`.

| | Quién | Qué | Depende de |
|---|---|---|---|
| **A** | Backend | Las fotos viajan por la API | — |
| **B** | Frontend | El técnico ve las fotos del cliente | **A** (solo del contrato de la sección A.1) |
| **C** | Full-stack | Panel del árbitro para resolver disputas | — |

**A y B trabajan en paralelo:** A publica el contrato de la API (A.1) **lo primero del día** y B construye contra él.
**C es independiente**: no toca ningún archivo de A ni de B.

---

## 0. Reglas que no se negocian

- **No se toca el contrato Soroban.** Cada función nueva obliga a redesplegar, cambia el contract ID y arrastra documentación, frontend e historial sembrado. A dos días, no.
- **Ningún secreto con prefijo `VITE_`.** Todo lo que lleve `VITE_` acaba en el navegador, a la vista de cualquiera. Las llaves van en variables de servidor.
- **Lee [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) antes de tocar una pantalla.** Paleta cerrada, Montserrat, tuteo.
- **En la interfaz nunca aparecen** *wallet*, *XLM*, *gas* ni *seed phrase*. Los montos, en soles.
- **Nadie se firma como co-autor** en los commits ni en las descripciones de PR.
- **No toques el frente de otro.** Si necesitas un cambio en el de al lado, pídelo.
- `cd frontend && npm test && npm run build` tienen que pasar antes del PR.

---

## A — Backend: las fotos viajan por la API

**El problema.** El cliente sube fotos y las ve, pero se quedan en su teléfono: `shared/api.ts`
guarda `fotos` como **un número**, y las imágenes viven en el `localStorage` de quien las subió.
El técnico abre la alerta y lee "El cliente no adjuntó fotos" — la pantalla ya sabe mostrarlas,
solo que nunca le llegan.

### A.1 El contrato — publícalo primero

**No metas las fotos en el listado.** `GET /api/solicitudes` se relee **cada 3 segundos**; con
cinco imágenes por solicitud serían megabytes por vuelta, en el plan gratis y con datos móviles.
Las imágenes van en su propio recurso, y solo se piden al abrir una solicitud.

En `shared/api.ts`:

```ts
/** Cuántas fotos tiene la solicitud. Las imágenes se piden aparte. */
fotos: number;            // en Solicitud: SE QUEDA COMO ESTÁ

/** Data URLs de las imágenes, al crear. */
fotos: string[];          // en SolicitudInput: CAMBIA de number a string[]

export const MAX_FOTOS = 5;
export const MAX_BYTES_FOTO = 200_000;
export const MAX_BYTES_FOTOS = 800_000;
```

Nuevo endpoint:

```
GET /api/solicitudes/:id/fotos  ->  200 { "fotos": ["data:image/jpeg;base64,...", ...] }
                                ->  404 NOT_FOUND si la solicitud no existe
```

Una solicitud sin fotos devuelve `{ "fotos": [] }`, **no** un 404.

Avisa al frontend en cuanto esté mergeado: es lo único que lo bloquea.

### A.2 Almacenamiento

Dos claves separadas en Redis, para que leer el listado no arrastre las imágenes:

- `solicitud:{id}` — el registro de siempre, con `fotos` como número.
- `solicitud:{id}:fotos` — el array de data URLs, en JSON.

Al crear la solicitud, el servidor **guarda las imágenes en su clave y escribe en el registro solo
el recuento**. El cliente no manda el número: lo calcula el servidor a partir del array, igual que
ya hace con `id`, `creadaEn` y `actualizadaEn`.

### A.3 Validación — esto es lo que más importa

El endpoint recibe cadenas que vienen del navegador. Trátalas como hostiles:

- **Como mucho `MAX_FOTOS`** elementos. Si llegan más, `400 INVALID`.
- Cada cadena empieza por `data:image/jpeg;base64,`, `data:image/png;base64,` o
  `data:image/webp;base64,`. Cualquier otra cosa, `400 INVALID`. **No aceptes `data:text/html`
  ni SVG**: un SVG puede llevar script dentro.
- Cada foto pesa **como mucho `MAX_BYTES_FOTO`**, y entre todas `MAX_BYTES_FOTOS`. Mide la
  longitud de la cadena, que es lo que ocupa de verdad en Redis.
- El cuerpo base64 solo contiene `A–Z a–z 0–9 + / =`. Si no, `400 INVALID`.

Rechaza con un mensaje que diga cuál falló, no un "algo salió mal".

### Criterios de aceptación

- [ ] `GET /api/solicitudes` **no** devuelve ninguna imagen, ni siquiera de una solicitud que las tenga. Compruébalo con `curl` y mirando el tamaño de la respuesta.
- [ ] Crear una solicitud con 2 fotos, y `GET /api/solicitudes/:id/fotos` devuelve esas 2, en el mismo orden.
- [ ] Una solicitud sin fotos devuelve `{"fotos":[]}` con 200.
- [ ] Un id que no existe devuelve `404 NOT_FOUND`.
- [ ] Seis fotos, una de 300 KB, una `data:text/html,...` y un SVG: los cuatro casos dan `400` con mensajes distintos.
- [ ] Tests del núcleo con el almacén en memoria, incluidos los cuatro rechazos.

---

## B — Frontend: el técnico ve las fotos del cliente

Arranca contra el contrato de A.1 en cuanto esté mergeado. Mientras tanto, prepara B.1, que no depende de nadie.

### B.1 Que ninguna foto se pase de tamaño

`src/images.ts` ya reescala a 800 px con calidad 0.6, pero **no comprueba el resultado**. Una foto
de un móvil moderno puede pasar de `MAX_BYTES_FOTO` igualmente, y el servidor la rechazaría.

Haz que `toStoredImage` garantice el tamaño: si la data URL supera `MAX_BYTES_FOTO`, reintenta
bajando la calidad (0.5, 0.4, 0.3) y, si aún no cabe, reduce el lado máximo a 600 y repite. Si al
final no cabe, lanza un error con un mensaje para la persona: *"Esta foto es demasiado grande.
Prueba con otra."*

### B.2 Enviar las fotos al crear

- `store.crearSolicitud` deja de guardar las imágenes en `masi.demo.fotosLocales.v1` y las manda
  en `fotos` dentro del `SolicitudInput`.
- **`cuando` sigue viviendo en local**, como hasta ahora. No lo toques: no es tu tarea.
- Borra del almacenamiento local las fotos que ya no se usan, para no dejar basura ocupando cuota.

### B.3 Pedirlas al abrir una solicitud

`aSolicitudLocal` deja de rellenar `fotos` desde el almacenamiento local: en el listado, `fotos`
pasa a ser lo que diga el servidor, **un número**.

Las imágenes se piden **solo al abrir una solicitud**, con un hook nuevo, por ejemplo
`useFotosDeSolicitud(id)`, que devuelva `{ fotos, cargando, error }`:

- `src/screens/ProviderAlertScreen.tsx` — **el que importa**: aquí es donde el técnico decide si
  se postula.
- `src/screens/RequestDetailScreen.tsx` — el cliente vuelve a ver las suyas desde cualquier teléfono.

Mientras cargan, un hueco gris del tamaño de la miniatura. Si fallan, una línea discreta:
*"No pudimos cargar las fotos."* Nunca una pantalla en blanco ni un salto de maquetación.

**Si `fotos` es 0, ni siquiera llames al endpoint.**

### Criterios de aceptación

- [ ] Con dos teléfonos: el cliente publica con 2 fotos y el técnico **las ve** en su alerta.
- [ ] Una solicitud sin fotos sigue diciendo "El cliente no adjuntó fotos" y **no** hace ninguna petición.
- [ ] Una foto de más de 5 MB desde la galería del móvil entra sin error y llega al servidor.
- [ ] Con el endpoint caído, la solicitud se sigue viendo y las fotos muestran el mensaje de error.
- [ ] Móvil a 360 px sin scroll horizontal.
- [ ] Tests de `toStoredImage` (que respeta el tope) y del hook (carga, vacío y error).

---

## C — Panel del árbitro

**Qué falta.** El contrato sabe repartir una disputa, y cliente y técnico ya pueden abrirla desde la
app. Lo que no existe es dónde resolverla: hoy se hace por consola.

**El árbitro es la cuenta `masi`, `GBGZZ3XKNJSMX3MNXB2J26WVV76ZJAKKOH2C35ZF5G4W2COZAMC7I77C`.**
Su llave secreta se obtiene con `stellar keys show masi` **en la máquina de Piero** y se carga en
Vercel como variable de tipo **Secret**, `ARBITER_SECRET`. No la pegues en ningún chat ni archivo.

### C.1 El endpoint

`frontend/server/arbitraje.ts` y `frontend/api/arbitraje.ts`. **Copia la forma de
`frontend/server/recarga.ts`**, que ya hace exactamente esto: construye la transacción, la firma con
una llave de servidor, la envía y espera confirmación. Cambia `mint` por `resolve`.

```
POST /api/arbitraje   { "jobId": "2", "providerBps": 7000 }
   -> 200 { "hash": "..." }
   -> 400 INVALID    si providerBps no es un entero de 0 a 10000, o el jobId no es un número
   -> 401 NO_AUTORIZADO   si falta o no cuadra la clave del panel
   -> 500 INTERNAL   si falta ARBITER_SECRET
```

**Protégelo.** El servidor firma con la llave del árbitro: sin autenticación, cualquiera que
encuentre la ruta puede repartir el dinero retenido de otros. Es testnet, pero no se entrega así.

Lo mínimo aceptable: una variable de servidor `ARBITER_PANEL_KEY` y una cabecera
`x-masi-arbitraje: <clave>` que el endpoint compara. **Compara en tiempo constante**, no con `===`,
y si no cuadra devuelve `401` sin decir por qué. Declara en el README que el panel es interno.

Añade `arbitraje` a la exclusión de la regla de reescritura en `frontend/vercel.json`, como están
`relayer`, `router` y `recarga`. Si te olvidas, la ruta se la traga el enrutador de la API.

### C.2 La pantalla

Ruta `/arbitraje`, **fuera de la navegación**: no la enlaces desde ninguna pantalla. Pide la clave
del panel al entrar y guárdala en memoria (no en `localStorage`).

Para **listar las disputas** no hace falta backend nuevo: los trabajos llevan id correlativo.
Recorre desde el 1 hacia arriba leyendo `get_job` —que es una simulación y no cuesta nada— hasta
que falle, con un tope de 50, y quédate con los que estén en estado `Disputed`. Hazlo en paralelo,
no en serie, o la pantalla tarda una eternidad.

De cada disputa muestra, **en soles**:

- Descripción del trabajo, y quién es el cliente y quién el profesional (direcciones acortadas).
- Total, adelanto de materiales ya entregado y **saldo en disputa**, que es lo único que se reparte.
- Un deslizador de 0 a 100 % para el técnico, con el reparto en soles **calculado en vivo a los dos
  lados**: "Al profesional S/ X · Al cliente S/ Y". Nadie debe calcular porcentajes de cabeza.
- Botón **Resolver**, con una confirmación que repita el reparto antes de firmar.

Tras resolver, relee el trabajo y muestra el resultado. Un fallo se enseña con `friendlyError`,
como el resto de la app, y el botón vuelve a estar disponible.

**El adelanto de materiales no se reparte nunca** — ya es del profesional. Dilo en la pantalla, que
es la duda que va a tener quien la use.

### Criterios de aceptación

- [ ] Con un trabajo en disputa de verdad en testnet, el panel lo lista con sus montos correctos en soles.
- [ ] Resolver al 70 % deja al profesional con el 70 % del saldo en disputa y al cliente con el 30 %, comprobado leyendo los saldos con `stellar contract invoke`.
- [ ] La comisión de la plataforma sale igual, y el trabajo queda como completado.
- [ ] `POST /api/arbitraje` sin la cabecera devuelve `401`. Con `providerBps` de `10001`, `400`.
- [ ] `grep -rn "ARBITER_SECRET" frontend/src frontend/dist` no devuelve nada tras `npm run build`.
- [ ] Un trabajo que no está en disputa no aparece en la lista.
- [ ] Tests del endpoint (validación y autenticación) y del cálculo del reparto.

---

## Orden de mergeo

1. **A.1** (el contrato de la API), lo primero y solo.
2. A.2 + A.3, y B en paralelo.
3. C, cuando esté; no colisiona con nada.

Si algo se tuerce y hay que elegir, **las fotos van antes que el panel del árbitro**: están en el
flujo principal que se graba. El panel se puede sustituir por un comando de consola.
