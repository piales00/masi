# P2 — Prueba de passkeys: guía de trabajo

**Para quien lleva el frente de cuentas.** Todo lo que necesitas está aquí; no hace falta que leas el scope entero para empezar.

**Fecha límite: el 22 por la noche.** Ese día se decide si seguimos con passkeys o pasamos al fallback. La decisión se toma con lo que hayas conseguido probar, así que lo que importa es llegar a una respuesta clara, no a algo bonito.

Caja de tiempo sugerida: **3 horas**.

---

## Qué hay que averiguar

Una sola pregunta: **¿puede un usuario registrarse con su huella en el celular y firmar una transacción de Stellar de punta a punta, sin wallet y sin pagar comisiones?**

Si la respuesta es sí, seguimos. Si es no, el 22 pasamos a Blux y no se pierde nada del contrato.

## Lo que ya está decidido — no lo replantees

| Cosa | Decisión | Por qué |
|---|---|---|
| Librería | **`passkey-kit`** | Modelo de firmantes plano, que es lo que necesitamos. Ver `P2_PASSKEYS.md` |
| Dominio | **`https://masiapp.vercel.app`** | Fijo y no se cambia nunca |
| Relayer | **OpenZeppelin Relayer** (Stellar Channels) | Verificado operativo el 20/09 |
| Red | **testnet** | Protocolo 28 |

No uses `smart-account-kit`: usa otro modelo de autorización on-chain y cambiar después obliga a rehacer el contrato de cuenta.

## Cuatro trampas que te van a costar horas

1. **El repo `kalepail/passkey-kit` está archivado.** Es el que tiene las 499 estrellas y al que apuntan casi todos los tutoriales y respuestas de foros. El bueno es **`stellar/passkey-kit`**. El paquete de npm ya sale del repo nuevo, así que instalar está bien; el peligro es copiar código o issues del viejo.
2. **Launchtube está deprecado.** Si un ejemplo lo menciona, es viejo. Lo reemplazó el relayer de OpenZeppelin.
3. **Ninguna variable `VITE_` puede llevar un secreto.** Todo lo que empieza por `VITE_` se empaqueta en el bundle y queda público. La clave del relayer vive solo en el servidor.
4. **Las URLs de preview de Vercel (`masiapp-git-…vercel.app`, `masiapp-abc123-…vercel.app`) son otro origen.** Una passkey creada ahí no sirve en el dominio principal. Prueba siempre en la URL principal.

---

## La regla que explica todo lo demás

**Una passkey pertenece a un origen y solo a ese origen.** El origen es esquema + dominio + puerto:

```
http://localhost:5173              ← origen A
https://masiapp.vercel.app        ← origen B
https://masiapp-git-rama-….vercel.app ← origen C (preview)
```

Una cuenta creada en A **no existe** en B. Consecuencias prácticas:

- Lo que crees en `localhost` es desechable. Sirve para ver si el flujo corre, no para cuentas que duren.
- **Las únicas cuentas que sobreviven son las creadas en `masiapp.vercel.app`.**
- Por eso ese dominio está congelado: si se renombra, todas las cuentas dejan de entrar.

WebAuthn además exige contexto seguro: **HTTPS, o `localhost`**, al que el navegador le da un permiso especial aunque sea HTTP. Ese permiso es justo lo que hace que todo funcione en tu escritorio y se rompa en el celular.

---

## Antes de empezar

- [ ] **Node 22 o superior** (`node --version`). Es el mínimo del stellar-sdk v16+.
- [ ] **pnpm** instalado.
- [ ] Un **Android** y, si puedes, un **iPhone**. Son pilas de WebAuthn distintas y el 25 hay prueba en dos celulares.
- [ ] Cable USB si vas a usar el reenvío de puertos de Chrome.

---

## Fase 1 — Escritorio (~45 min)

El repo oficial trae un demo en Svelte 5 + Vite que ejercita la API completa contra testnet.

```bash
git clone https://github.com/stellar/passkey-kit
cd passkey-kit
pnpm install && pnpm build      # compila el SDK; el demo lo consume por link:..

cd demo
cp .env.example .env.local
pnpm --ignore-workspace install
pnpm dev                        # http://localhost:5173
```

El `.env.example` ya trae los valores públicos de testnet: el RPC, la frase de red, el hash del WASM de la smart wallet (`97ce047884106b1c6c3bb40b8973cc48db1c4dad95c9e20462bf2c701daa764e`) y el SAC nativo.

**Deja `VITE_relayerProxyUrl` sin poner en esta fase.** Los flujos principales corren igual y el envío muestra "no relayer proxy". Es a propósito: separa *¿la passkey firma?* de *¿el relayer envía?*. Si arrancas con los dos a la vez y algo falla, no sabrás cuál de los dos fue.

- [ ] Registrar una passkey (huella, Windows Hello o Touch ID) y que se despliegue una dirección `C…`.
- [ ] Recargar la página y que reconecte solo, sin volver a registrar.
- [ ] Apuntar la dirección `C…` que salió.

## Fase 2 — El relayer (~30 min)

Ahora que sabes que la firma funciona, añade el pago de comisiones.

Consigue una clave de la instancia hosteada de testnet:

```bash
curl https://channels.openzeppelin.com/testnet/gen
# → {"apiKey":"..."}
```

La clave va en el **worker de servidor** (`relayer-proxy/` en el repo), nunca en el navegador. Levántalo y apunta `VITE_relayerProxyUrl` a él.

- [ ] Firmar y enviar una transacción con las comisiones pagadas por el relayer.
- [ ] Ver el hash en [stellar.expert testnet](https://stellar.expert/explorer/testnet).
- [ ] Confirmar que el usuario **no necesitó XLM** en ningún momento.

## Fase 3 — Celular (~1 h). Aquí es donde se rompe

En el escritorio funciona por el permiso especial de `localhost`. El celular entrando por IP de red local (`http://192.168.1.x:5173`) **no es contexto seguro**: WebAuthn simplemente no aparece, sin error claro. Es el fallo que hace perder la tarde.

Tres caminos, en orden de preferencia:

**A. El dominio de producción — el que vale.** Despliega el demo a `masiapp.vercel.app` y prueba ahí. Es la única prueba que mide lo que realmente vamos a usar, y de paso confirma que el dominio quedó bien configurado.

**B. Reenvío de puertos de Chrome (solo Android).** Conserva el origen `localhost`, así que WebAuthn funciona sin HTTPS:

1. Activa Depuración USB en el teléfono y conéctalo por cable.
2. En el escritorio abre `chrome://inspect/#devices` → **Port forwarding**.
3. Añade `5173` → `localhost:5173` y marca la casilla.
4. En el móvil abre `http://localhost:5173`.

Rápido para iterar. **No sirve para iPhone** y las cuentas que crees ahí son desechables.

**C. Túnel HTTPS** (`cloudflared tunnel --url http://localhost:5173`). Da HTTPS real y sirve para iPhone, pero es otro origen más y la URL cambia en cada arranque, así que cada sesión empieza de cero. Último recurso.

- [ ] Que aparezca el diálogo nativo de huella / Face ID.
- [ ] Que firme y el hash salga en el explorador.
- [ ] Cerrar el navegador, volver a abrir y que reconecte sin registrar de nuevo.
- [ ] Probar en **Android**.
- [ ] Probar en **iPhone**. Si algo va a fallar en iOS, hoy es el día de saberlo.

---

## Qué tienes que reportar (~15 min)

Esto es lo que se usa para decidir el 22. Anótalo aunque salga mal — sobre todo si sale mal.

- [ ] **¿Firmó de punta a punta en un celular real? Sí o no.** Es la respuesta que importa.
- [ ] La dirección `C…` creada y el hash de su despliegue (van al README).
- [ ] Un hash de transacción firmada con huella y pagada por el relayer.
- [ ] En qué teléfonos funcionó y en cuáles no, con modelo y navegador.
- [ ] Si hubo que fijar `rpId` a mano. Por defecto toma el origen del navegador; `allowedOrigins` es obligatorio si fijas `rpId` fuera de un navegador.
- [ ] Cualquier paso donde te quedaste atascado más de 30 minutos.

---

## Resultados de la primera prueba — 20/09, Android

**Funcionó: se desplegó una smart wallet real desde un celular.**

```
Deploy wallet ✓   tx ca45f786…96546cc3
```

Con esto la pregunta del 22 ya tiene respuesta provisional y es que sí. Lo que queda no es "¿se puede?", sino repetirlo en el dominio bueno y con el relayer.

### Hallazgo 1 — pide la huella dos veces, y es correcto

No es un fallo del kit ni de la configuración. Son **dos ceremonias distintas de WebAuthn**:

| Paso | Llamada | Qué pide |
|---|---|---|
| 1 | `createWallet` | *Registro*: crear la llave. Es la pantalla "Crea una llave de acceso" |
| 2 | `connectWallet` | *Autenticación*: una **fresh assertion**, para comprobar que controlas la llave que acaba de quedar on-chain |

El kit lo exige a propósito: entre una cosa y la otra hay un despliegue en la red, y sin el segundo paso la app se fiaría de algo que no ha verificado. `confirmWalletCreation` no pide huella; la que la pide es `connectWallet`.

**Cómo hacer que en Masi se sienta como una sola.** No hay obligación de llamar a `connectWallet` justo después de registrar. Deja entrar al usuario tras el registro y pide la huella recién cuando vaya a hacer algo de verdad — que es el momento en que el scope ya prevé que la toque, **al pagar**. Así la segunda ceremonia deja de ser un trámite repetido y pasa a ser la firma del pago.

### Hallazgo 2 — "Create wallet failed" puede mentir

En la prueba salió esto:

```
4:55:00  Deploy wallet ✓  tx ca45f786…96546cc3
4:55:03  Create wallet failed: Passkey authentication failed  WebAuthnError [3002]
```

**El despliegue funcionó.** Lo que falló tres segundos después fue la segunda ceremonia, la de autenticación — los códigos `3xxx` son del grupo WebAuthn. La wallet existe en testnet aunque el mensaje diga lo contrario.

Si vuelve a pasar: usa **"Sign in (passkey)"** con la misma llave en vez de crear otra. Crear una segunda wallet porque la primera "falló" deja cuentas huérfanas.

### Hallazgo 3 — la prueba se hizo en otro dominio

Se probó en `prismatic-crumble-a96f0e.netlify.app`, no en `masiapp.vercel.app`. El propio diálogo de Google lo dice: *"Esta llave de acceso se usará para prismatic-crumble-a96f0e.netlify.app"*.

Son orígenes distintos, así que **ninguna cuenta creada ahí existirá en el nuestro**.

Para probar está bien y no hay que rehacer nada. Pero:

- [ ] Todo lo creado en ese sitio es **desechable**; no lo uses como referencia de "ya tengo cuenta".
- [ ] **Repetir la prueba en `masiapp.vercel.app` antes de sembrar los trabajos del 24.** Si se siembran perfiles con cuentas de otro dominio, el día de grabar no entra nadie.

### Hallazgo 4 — funciona en el celular pero no en la laptop

Es normal y no es un fallo del código. **La laptop necesita un autenticador de plataforma**, y muchas no lo tienen utilizable:

- **Linux:** Chrome y Firefox no traen autenticador de plataforma. Solo ofrecen "usar un teléfono" por QR o una llave física. No hay nada que arreglar.
- **Windows:** hace falta Windows Hello **configurado con PIN**. Tener lector de huella no basta si nunca se activó.
- **Mac:** Touch ID.

No bloquea nada: Masi es una app móvil, el vídeo se graba en un teléfono y el criterio de la decisión del 22 es "¿firma en un celular real?". Ya sabemos que sí.

**Para desarrollar sin depender del teléfono**, Chrome trae un autenticador virtual:

1. DevTools (F12) → tres puntos → **More tools** → **WebAuthn**.
2. Marca **Enable virtual authenticator environment**.
3. **Add** con protocolo `ctap2`, transporte `internal`, y *resident keys* y *user verification* activadas.

El navegador simula la huella y el flujo entero funciona sin hardware. Dos avisos: las credenciales virtuales **se borran al cerrar DevTools**, y **las wallets de María y Juan tienen que crearse con huella real en el teléfono**, no con el autenticador virtual.

Para diagnosticar, mira el error en consola: `NotSupportedError` o que no salga diálogo significa que no hay autenticador; `NotAllowedError` significa que sí lo hay pero se canceló.

### Lo que sigue pendiente

- [ ] Firmar una transacción con el relayer pagando las comisiones (fase 2).
- [ ] Repetir en el dominio definitivo.
- [ ] Probar en iPhone.

---

## Si no sale

**No pasa nada y no es un fracaso.** El fallback está definido desde el principio y es cambio solo de frontend: el contrato, las reseñas on-chain y el relayer no se tocan.

1. **Blux** ([blux.cc](https://blux.cc)) — registro con Google, email o teléfono. La promesa de "sin wallet, sin frase semilla" se mantiene.
2. **Freighter** — si Blux tampoco.

Antes de adoptar Blux hay 30 minutos de verificación: que el paquete esté publicado y el ejemplo corra en testnet; que el flujo OAuth devuelva una dirección Stellar que firme; **si la llave es no-custodial y cómo se recupera** (eso va al README); y si la cuenta resultante es dirección G, quién paga la reserva de 1 XLM.

---

## Contexto por si lo necesitas

Lo que ya está vivo en testnet, por si quieres probar la firma contra nuestro contrato de verdad en vez del demo:

| | |
|---|---|
| Contrato `escrow` | `CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV` |
| SAC de PEN-test | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |

Eso es un extra, no parte de la prueba. La prueba es el demo de `passkey-kit`.

Más detalle y las razones de cada decisión: [`P2_PASSKEYS.md`](./P2_PASSKEYS.md). Estado del despliegue: [`DESPLIEGUE.md`](./DESPLIEGUE.md).

> **Nota:** `passkey-kit` no tiene auditoría de seguridad independiente. Para un hackathon en testnet da igual, pero si alguna vez se habla de producción, va en las limitaciones del README.
