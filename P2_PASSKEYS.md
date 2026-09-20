# P2 — Decisión de librería de passkeys y verificación del relayer

**Fecha de la verificación: 20 de septiembre de 2026.** Los datos de abajo son de ese día; si alguien lee esto después, vuelve a comprobarlos.

Cierra el punto "Pendiente de verificar hoy" de [`masi-scope.md`](./masi-scope.md).

---

## Decisión: `passkey-kit`

Se mantiene la recomendación del scope. El modelo de firmantes plano cubre lo que Masi necesita, y no hacen falta context rules, umbrales ni límites de gasto.

**Esto no se puede deshacer sin costo.** `passkey-kit` y `smart-account-kit` no son versiones sucesivas sino SDK hermanos con modelos de autorización on-chain distintos. Cambiar después obliga a rehacer el contrato de cuenta y a que todos vuelvan a registrarse.

### Evidencia

| | `passkey-kit` | `smart-account-kit` |
|---|---|---|
| Repo | `stellar/passkey-kit` | `stellar/smart-account-kit` |
| Versión npm | **0.19.1**, publicada 2026-09-18 | 0.8.0, publicada 2026-09-08 |
| Publicaciones en 60 días | 17 | 9 |
| Estado del repo | activo (último commit 2026-09-09) | activo (último commit 2026-09-08) |
| Modelo de autorización | mapa plano de firmantes (`Signatures`) | context rules de OpenZeppelin + digest de auth, sobre la cuenta auditada de `stellar-contracts` |
| Usado por el tutorial oficial | sí — [Passkey Powered Guestbook](https://developers.stellar.org/docs/build/apps/guestbook) | no |

Los dos están mantenidos y ninguno declara al otro obsoleto. La diferencia que decide es que el modelo plano es el que necesitamos y es el que documenta Stellar con un tutorial completo de punta a punta.

### Trampa: el repo archivado

**`kalepail/passkey-kit` está archivado** (último commit 2026-07-31, 499 estrellas) y sucedido por `stellar/passkey-kit`.

Es el repo con toda la visibilidad y al que apuntan los tutoriales y respuestas viejas. El paquete npm `passkey-kit` sí sale del repo nuevo (`git+https://github.com/stellar/passkey-kit.git`), así que instalar por npm es seguro; el riesgo está en copiar código o issues del repo archivado.

**Si un ejemplo apunta a `kalepail/passkey-kit`, está desactualizado.**

### Instalación

```bash
npm install passkey-kit
```

Arrastra `@simplewebauthn/browser`, `@stellar/stellar-sdk`, `passkey-kit-sdk`, `sac-sdk`, `base64url` y `buffer`.

Requiere **Node.js 22+** (mínimo del stellar-sdk v16).

---

## Relayer: operativo

`@openzeppelin/relayer-plugin-channels` v0.21.0, publicada 2026-09-11.

Comprobado hoy contra la instancia hosteada de testnet:

| Endpoint | Respuesta | Lectura |
|---|---|---|
| `https://channels.openzeppelin.com/testnet` | HTTP 401 | Vivo; rechaza sin API key, que es lo correcto |
| `https://channels.openzeppelin.com/testnet/gen` | HTTP 201 + `{"apiKey":"..."}` | Emite claves; funciona |

Para conseguir la tuya:

```bash
curl https://channels.openzeppelin.com/testnet/gen
```

### La clave del relayer NO va en el navegador

`passkey-kit` se parte en dos a propósito:

| Módulo | Dónde corre | Qué tiene |
|---|---|---|
| `PasskeyKit` | navegador | Construye y **firma**. Ningún secreto. |
| `passkey-kit/server` (`PasskeyServer`) | servidor | **Guarda la clave del relayer.** Nunca se importa desde el navegador. |

El demo oficial lo dice sin rodeos en su `.env.example`: *"Never add a `VITE_`-prefixed secret."* Todo lo que empieza por `VITE_` **se empaqueta en el bundle y es público**. La clave del relayer vive en un worker aparte (`relayer-proxy/` en el repo), y el navegador solo conoce su URL.

```typescript
// SOLO en el servidor / worker
import { PasskeyServer } from "passkey-kit/server";

const server = new PasskeyServer({
  rpcUrl: "https://soroban-testnet.stellar.org",
  relayer: {
    baseUrl: process.env.RELAYER_BASE_URL!,   // https://channels.openzeppelin.com/testnet
    apiKey: process.env.RELAYER_API_KEY!,
  },
});

// No lanza excepción en los fallos esperados: hay que ramificar en result.success
const result = await server.send(signedTx);
```

**La clave va en `.env` del servidor, nunca en el repo ni en una variable `VITE_`.** Añade `.env` y `.env.local` a `.gitignore` antes de guardarla.

Dos detalles que muerden: el relayer exige `timeoutInSeconds <= 30` (el default del kit es 30), y `PasskeyServer.send` no lanza excepción cuando algo falla de forma esperada — devuelve un resultado que hay que comprobar.

El relayer usa el mecanismo nativo de fee bump de Stellar, así que el usuario nunca necesita XLM. Reemplaza a Launchtube, que está deprecado: **si encuentras un ejemplo con Launchtube, está viejo.**

Restricción del scope que hay que implementar: el relayer **solo acepta llamadas a nuestro contrato y al SAC de PEN-test**. No es configuración del servicio hosteado; es una comprobación que hacemos nosotros antes de enviar.

Para producción se autohospeda con Docker ([GitHub](https://github.com/OpenZeppelin/openzeppelin-relayer)). En el hackathon no hace falta.

---

## La prueba de 3 horas, paso a paso

La verificación de arriba es de escritorio. Esto solo se comprueba ejecutando.

### Antes de empezar: la regla que lo explica todo

**Una passkey pertenece a un origen y solo a ese origen.** El origen es esquema + dominio + puerto: `https://masi.netlify.app` y `https://deploy-preview-3--masi.netlify.app` son orígenes distintos, y `http://localhost:5173` es un tercero.

De ahí salen las tres consecuencias que ordenan la prueba:

1. Una cuenta creada en `localhost` **no existe** en el dominio de Netlify. Es desechable.
2. Lo mismo con un túnel (ngrok, Cloudflare). Sirve para ver si el flujo corre, no para crear cuentas que duren.
3. **Las únicas cuentas que sobreviven son las creadas en el dominio definitivo.** Por eso el subdominio se congela hoy, antes de sembrar los trabajos del 24.

WebAuthn exige contexto seguro: HTTPS, **o** `localhost`, que el navegador trata como seguro aunque sea HTTP. Ese permiso especial es lo que hace que todo funcione en el escritorio y se rompa en el celular si no lo preparas.

### Fase 1 — Escritorio, con el demo oficial (~45 min)

El repo trae un demo Svelte 5 + Vite que ejercita la API completa contra testnet.

```bash
git clone https://github.com/stellar/passkey-kit
cd passkey-kit
pnpm install && pnpm build      # compila el SDK; el demo lo consume por link:..

cd demo
cp .env.example .env.local
pnpm --ignore-workspace install
pnpm dev                        # http://localhost:5173
```

Node 22+. El `.env.example` ya trae los valores públicos de testnet, incluido el WASM hash de la smart wallet (`97ce0478…`, fijado en `docs/deployments-2026-09-01.md`) y el SAC nativo.

Si dejas `VITE_relayerProxyUrl` sin poner, los flujos principales corren igual y el envío muestra "no relayer proxy". **Empieza así:** separa "¿la passkey firma?" de "¿el relayer envía?". Si arrancas con los dos a la vez y falla, no sabes cuál de los dos fue.

Comprueba en este orden:

- [ ] Registrar una passkey (huella / Windows Hello / Touch ID) y que se despliegue una dirección `C…`.
- [ ] Recargar la página y que `connectWallet` reconecte solo, sin volver a registrar.
- [ ] Firmar una transacción y ver el hash en [stellar.expert](https://stellar.expert/explorer/testnet).
- [ ] Levantar el `relayer-proxy/` del repo con la API key y repetir el envío ya patrocinado.

### Fase 2 — Celular (~1 h). Aquí es donde se rompe

En el escritorio funciona por el permiso especial de `localhost`. El celular no tiene ese permiso al entrar por IP de red local: `http://192.168.1.x:5173` **no es contexto seguro** y WebAuthn simplemente no aparece. Es el error que hace perder la tarde.

Tres caminos, en orden de preferencia:

**A. El dominio de Netlify (el que vale).** Despliega el demo al subdominio definitivo y prueba ahí. Es la única prueba que mide lo que realmente vamos a usar, y de paso confirma que el dominio quedó bien. Es el camino recomendado porque el subdominio hay que fijarlo hoy de todas formas.

**B. Reenvío de puertos de Chrome (Android).** Conserva el origen `localhost`, así que WebAuthn funciona sin HTTPS:

1. Activa Depuración USB en el teléfono y conéctalo por cable.
2. En el escritorio: `chrome://inspect/#devices` → **Port forwarding**.
3. Añade `5173` → `localhost:5173` y marca la casilla.
4. En el móvil abre `http://localhost:5173`.

Rápido para iterar. **No sirve para iPhone** (Safari no hace este reenvío) y las cuentas que crees ahí son desechables.

**C. Túnel HTTPS** (`cloudflared tunnel --url http://localhost:5173`). Da HTTPS real y sirve para iPhone, pero es otro origen más y la URL cambia en cada arranque, así que cada sesión empieza de cero. Último recurso.

Comprueba:

- [ ] Que aparezca el diálogo nativo de huella / Face ID.
- [ ] Que firme y el hash salga en el explorador.
- [ ] Cerrar el navegador, volver a abrir y que reconecte sin registrar de nuevo.
- [ ] **Android y iPhone**, que son pilas de WebAuthn distintas. El 25 hay prueba en dos celulares; si algo va a fallar en iOS, mejor saberlo hoy.
- [ ] Confirmar que `__check_auth` valida la firma secp256r1 (se ve en la simulación de la transacción).

### Fase 3 — Lo que hay que dejar anotado (~15 min)

- La dirección `C…` creada y su hash de despliegue, para el README.
- Si `rpId` hubo que fijarlo a mano. Por defecto toma el origen del navegador; `allowedOrigins` es obligatorio si fijas `rpId` fuera de un navegador.
- Qué falló y en qué teléfono. Eso alimenta la decisión de fallback del 22 en la noche.

### Referencias

- [Tutorial del Guestbook](https://developers.stellar.org/docs/build/apps/guestbook) — docs oficiales, passkey-kit con el mismo patrón que Masi (una smart wallet por usuario, direcciones C). [Passkeys Prerequisites](https://developers.stellar.org/docs/build/apps/guestbook/passkeys-prerequisites) cubre el lookup inverso de passkey a dirección.
- [Embedded Wallets del SDP](https://developers.stellar.org/docs/platforms/stellar-disbursement-platform/admin-guide/embedded-wallets) — transferencia SAC a wallet de contrato, comisión patrocinada, receptor que no paga nada. Vale para P1 también.

> **Nota del propio repo:** `passkey-kit` no tiene auditoría de seguridad independiente. Para un hackathon en testnet da igual; si alguna vez se habla de producción, va en las limitaciones del README.

---

## Bloqueado: el subdominio de Netlify

**Esto lo tiene que decidir una persona, hoy.** No es una decisión técnica, es elegir un nombre — y una vez elegido no se toca nunca.

La passkey queda atada al origen exacto. Si el subdominio se renombra, todas las cuentas creadas antes dejan de entrar. Tiene que estar fijo **antes** de sembrar los trabajos del 24.

- Probar siempre en la URL principal. **Nunca** en un deploy preview (`deploy-preview-N--...`): es otro origen y la passkey no funciona ahí.
- `localhost` sirve para desarrollar (WebAuthn lo permite sin HTTPS), pero no prueba nada sobre el dominio real.

---

## Recordatorio: la decisión de fallback no es hoy

Es el **22 en la noche**. Si para entonces las passkeys no firman de punta a punta, se pasa a Blux (registro con Google/OAuth) y, si no, a Freighter.

El fallback es cambio solo de frontend: el contrato, las reseñas on-chain y el relayer no se tocan.

Antes de adoptar Blux, 30 minutos para verificar: que el paquete esté publicado y el ejemplo corra en testnet; que el flujo OAuth devuelva una dirección Stellar que firme; **si la llave es no-custodial y cómo se recupera** (va al README); y si la cuenta resultante es dirección G, quién paga la reserva de 1 XLM — en testnet es friendbot, en producción es un costo por usuario que hay que declarar como limitación.
