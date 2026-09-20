# Masi — Tareas del 20 de septiembre

Primer día de los cuatro frentes en paralelo. El punto de integración crítico es el **22**, cuando el contrato desplegado se conecta con las passkeys; todo lo de hoy existe para que ese día no se rompa.

Fuente: cronograma de [`masi-scope.md`](./masi-scope.md) y reglas de [`CLAUDE.md`](./CLAUDE.md).

---

## Decisiones que se cierran hoy y ya no se pueden deshacer

Estas dos van primero porque bloquean al resto de la semana.

| Decisión | Quién | Por qué no tiene vuelta atrás |
|---|---|---|
| **Subdominio `*.netlify.app` definitivo** | P2 | La passkey queda atada al dominio exacto. Si se renombra, las cuentas creadas antes dejan de entrar. Tiene que estar fijo **antes** de sembrar los trabajos del 24. |
| **`passkey-kit` vs. `smart-account-kit`** | P2 | Usan modelos de autorización on-chain distintos. Cambiar después obliga a rehacer el contrato de cuenta. |

Recomendación del scope: `passkey-kit` (modelo de firmantes plano). `smart-account-kit` solo se justifica si hicieran falta límites de gasto o umbrales, y Masi no los necesita.

Probar siempre en la URL principal, **nunca** en un deploy preview (`deploy-preview-N--...`): es otro origen y la passkey no funciona ahí.

---

## P1 — Contrato

**Estados y funciones principales del `escrow`.**

- [ ] Proyecto Rust con `soroban-sdk`; tipo `Job` y enum con los 9 estados.
- [ ] `init`, `create_job`, `accept`, `fund`, `start`, `submit`, `approve`, `auto_release`, `cancel`.
- [ ] `require_auth` del rol indicado en la tabla del scope, en **cada** función de escritura.
- [ ] Almacenamiento **persistente** para trabajos y `jobs_of`, extendiendo el TTL en cada escritura.
- [ ] Emitir eventos desde ya: `requested`, `accepted`, `funded`, `started`, `submitted`, `released`, `cancelled`.
- [ ] Definir (aunque no implementar) las firmas de `dispute`, `resolve` y `rate`, para que P4 pueda tipar contra ellas.

Para mañana: disputa, `rate`, tests y despliegue en testnet.

**Cuidado con:**
- Los saldos de direcciones C son `i128`, no los `i64` de las trustlines.
- El adelanto de materiales no se puede disputar una vez entregado. `resolve` reparte **solo el saldo**.
- `auto_release` corre desde `submit`, no desde la creación.

---

## P2 — Cuentas

**Prueba de 3 horas + elegir librería.** Es la tarea con caja de tiempo explícita del día.

- [ ] Fijar el subdominio de Netlify y no volver a tocarlo.
- [ ] Decidir entre `passkey-kit` y `smart-account-kit` (ver tabla de arriba).
- [ ] Verificar que el ejemplo de la librería elegida corra en **testnet**.
- [ ] Verificar que el OpenZeppelin Relayer esté operativo: instancia hosteada de testnet en `https://channels.openzeppelin.com/testnet`, API keys en `/gen`. Launchtube está deprecado.
- [ ] Probar en un celular real hoy, no el 22: en `localhost` las passkeys funcionan sin HTTPS, así que el riesgo recién aparece al salir del escritorio.

Lectura recomendada (también para P1): el flujo de Embedded Wallets del Stellar Disbursement Platform es exactamente nuestro patrón — transferencia SAC a una wallet de contrato, comisión patrocinada, receptor que no paga nada.

**La decisión de fallback no es hoy, es el 22 en la noche.** Si las passkeys no firman de punta a punta para entonces, se pasa a Blux (registro por Google/OAuth); y si no, Freighter. El fallback es cambio solo de frontend: el contrato, las reseñas on-chain y el relayer no se tocan.

---

## P3 — Marketplace

**JSON de proveedores y búsqueda con datos falsos.**

- [ ] JSON con los 8 proveedores de prueba: nombre, oficio, distrito, precio referencial, foto genérica.
- [ ] Incluir a **Juan, pintor en Surco** — es el caso del video.
- [ ] Pantalla de búsqueda: filtro por oficio y distrito, tarjetas con estrellas y trabajos completados.
- [ ] Que la forma de los datos falsos sea **exactamente** la que después devolverá `rating_of`, para que el 22 conectar sea solo cambiar la fuente.

Oficios de la guía de estilo: Electricidad, Gasfitería, Cerrajería, Carpintería, Pintura, Instalaciones, Reparaciones, Limpieza, Aire Acondicionado, Más servicios.

---

## P4 — Flujo

**Pantallas del flujo con datos falsos.**

- [ ] PWA React + Vite en marcha.
- [ ] Pantalla de trabajo (cliente): solicitar, pagar protegido, aprobar, disputar, calificar.
- [ ] Pantalla de trabajo (proveedor): aceptar, "Pago asegurado", iniciar, terminar.
- [ ] Modelar los 9 estados en el frontend hoy, para que el 21 conectar con el contrato sea cambiar la fuente de datos y nada más.
- [ ] **Acordar con P1 la forma de `get_job` antes de que termine el día.** Esto es lo que protege el punto de integración del 22.

Para el 22: recarga simulada (caja de 30 min) y eventos en vivo.

---

## Flujo para crear las pantallas

Vale para P3 y P4. Son cinco pantallas; el orden importa porque el estado compartido se define una sola vez.

### Antes de escribir la primera línea

1. **Lee `STYLE_GUIDE.md`.** Es obligatorio antes de crear o modificar cualquier pantalla.
2. Pega los tokens CSS de la §12 en un único archivo global. Nadie escribe un hex a mano después de eso.
3. Carga Montserrat con los pesos 400/600/700/800 desde Google Fonts, con el fallback que indica la guía.
4. Íconos: **Lucide** o **Phosphor**, estilo línea redondeada, trazo 2 px. Nunca mezclar rellenos con línea en la misma pantalla.
5. Mobile-first: todo se diseña a **360 px** de ancho primero.

### Orden de construcción

**Paso 1 — Componentes compartidos.** Antes que cualquier pantalla:

- Botón primario (píldora, `--masi-blue`, texto blanco, 48–52 px de alto).
- Botón de acento (`--masi-orange`, texto **navy**, nunca blanco). Máximo uno por pantalla.
- Tarjeta (radio 20 px, sombra suave, borde `1px solid #E5E7EB`).
- Tarjeta de profesional (foto circular, nombre, oficio, calificación, insignia "Verificado").
- Input (radio 12 px, alto 48 px, anillo azul en focus).
- Chip / badge de estado.
- Barra de navegación inferior.

**Paso 2 — Máquina de estados.** Los 9 estados del trabajo, en un solo lugar, antes de las pantallas de trabajo:

```
Requested → Accepted → Funded → Started → Submitted → Released
                                   ↓          ↓
                                Disputed → Resolved
Requested / Accepted / Funded → Cancelled
```

Cada estado define: qué ve el cliente, qué ve el proveedor, qué botón está activo. `rate` solo se habilita desde `Released` o `Resolved`, y una sola vez por trabajo.

**Paso 3 — Las pantallas, en este orden:**

| # | Pantalla | Frente | Fuente de datos final |
|---|---|---|---|
| 1 | Búsqueda | P3 | JSON de proveedores + `rating_of` |
| 2 | Perfil del proveedor | P3 | JSON + `jobs_of`, `rating_of`, `get_job` |
| 3 | Trabajo (cliente) | P4 | contrato + eventos |
| 4 | Trabajo (proveedor) | P4 | contrato + eventos |
| 5 | Recargar (simulado) | P4 | `mint` del SAC firmado por la emisora |

La recarga va última a propósito: está en caja de 30 minutos, no aparece en ninguna de las 7 escenas del video y es lo primero que se recorta si el 22 aprieta.

**Paso 4 — Datos falsos con la forma real.** Cada pantalla se construye contra un objeto que tiene los mismos campos y tipos que devolverá el contrato. Conectar el 21 y el 22 debe ser cambiar de dónde viene el objeto, no reescribir la pantalla.

### Reglas que no se negocian en ninguna pantalla

- **Nunca aparecen las palabras** *wallet*, *XLM*, *gas* ni *seed phrase*.
- Los montos **siempre en soles**.
- Lo técnico se traduce a lenguaje humano: "Pago confirmado", no "Hash de transacción validado". El hash y la red van en una sección secundaria "Ver detalles".
- Tuteo, frases cortas, español neutro. Cercano y tranquilizador, nunca técnico ni frío.
- Una sola acción principal por pantalla.
- El naranja es un destello, no un color dominante: 60 % blanco, 30 % azules, 10 % acentos.
- Contraste mínimo WCAG AA. Nunca texto blanco sobre naranja ni naranja pequeño sobre blanco.
- Estados señalados con icono **y** texto, no solo con color.
- Carga con skeletons en gris `#E5E7EB`, no con spinners largos.
- Animaciones de 150–250 ms, `ease-out`, respetando `prefers-reduced-motion`.

### Antes de cada commit de interfaz

Corre la checklist de la §13 de `STYLE_GUIDE.md`:

- [ ] ¿Solo colores de la paleta (o sus tintes)?
- [ ] ¿Montserrat con los pesos definidos?
- [ ] ¿El naranja solo como acento y con contraste correcto?
- [ ] ¿Botones en píldora, tarjetas redondeadas, sombras suaves?
- [ ] ¿Se ve bien a 360 px?
- [ ] ¿Contraste AA, con icono o texto además del color?
- [ ] ¿Los textos suenan cercanos y claros?
- [ ] ¿Transmite confianza, rapidez y cercanía?

---

## Recordatorio: orden de recorte

Si falta tiempo, se recorta en este orden:

1. Disputa y `resolve`
2. Passkeys (pasar al fallback)
3. Comentarios de las reseñas (quedan solo estrellas)
4. Búsqueda (queda una lista)
5. Pantalla de recarga

**Nunca se recortan:** el flujo principal con adelanto para materiales, `auto_release`, `rate` y el perfil con historial on-chain.
