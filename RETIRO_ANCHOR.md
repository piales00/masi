# Cómo sale el dinero: el retiro por anchor

**23 de septiembre de 2026.** Responde a la pregunta que cierra el pitch: *"¿y cómo saca
su plata el técnico?"*.

---

## La respuesta corta

Masi no mueve dinero fiat ni quiere hacerlo. El puente entre la cadena y los bancos lo
pone un **anchor**: una entidad regulada que recibe el activo y paga a una cuenta
bancaria. Masi solo habla los estándares.

Para soles ese anchor existe y es peruano: **[Anclap](https://anclap.com/) emite PEN en
Stellar**, respaldado 1:1, y permite retirar a una cuenta bancaria.

---

## Por qué la demo no usa Anclap

Consultado a Anclap el 22/09. Su respuesta:

> Eso está en mainnet, para testnet como tal no hay y se necesita activar KYC. Pero
> puedes integrar el flujo SEP-24 con el Anchor de referencia de Stellar para demostrar
> la mecánica de deposit/withdraw, y mencionar la integración con PEN como algo para
> implementar después.

Es exactamente lo que está hecho.

---

## Lo que está implementado

Pantalla **Retirar tu dinero**, en el perfil del profesional (`/profesional/retirar`),
conectada al anchor de referencia de Stellar (`testanchor.stellar.org`).

| Paso | Estándar | Qué pasa |
|---|---|---|
| Descubrir el anchor | SEP-1 | Se lee su `stellar.toml`: endpoints, activos y llave de firma |
| Identificarse | **SEP-45** | El profesional firma con su **huella** |
| Abrir el retiro | SEP-24 | El anchor da una ventana propia para KYC y datos bancarios |
| Seguir el estado | SEP-24 | Se consulta la transacción y se traduce al español |

### SEP-45 es la pieza que hacía falta

SEP-10, la autenticación habitual con anchors, firma con la llave privada de una cuenta
`G…`. **Nuestros usuarios no tienen llave**: son smart wallets con passkey, direcciones
`C…`. Sin SEP-45 no podrían identificarse ante ningún anchor, y el retiro sería
imposible por diseño.

SEP-45 lo resuelve con entradas de autorización de Soroban. El anchor arma una llamada a
`web_auth_verify`, el usuario firma **su** entrada con la huella, y el anchor devuelve un
JWT. `passkey-kit` expone `signAuthEntry`, que es justo esa primitiva.

**Antes de firmar se verifica el reto** (`verificarReto`): que la llamada sea a
`web_auth_verify` del contrato declarado, sin subinvocaciones, que la cuenta y los
dominios sean los nuestros, y que la otra entrada venga firmada por el anchor. Firmar sin
mirar sería firmar un cheque en blanco.

### Dos trampas encontradas, documentadas en el código

1. **El array de entradas no es un `ScVec`.** Es un array XDR de
   `SorobanAuthorizationEntry`, y el SDK no publica un tipo para él. Se arma con el
   descriptor de `@stellar/js-xdr`. Además, `toXDR()` sobre ese descriptor se serializa a
   sí mismo: hay que escribir con un `XdrWriter` explícito.
2. **El anchor de referencia lee `authorizationEntries`, no `authorization_entries`.**
   La especificación nombra la segunda, y el servidor responde *"authorization_entries is
   required"* justo cuando le mandas esa. Se envían las dos grafías.

---

## Qué es real y qué no

**Real:** los estándares, la verificación del reto, la firma con huella, la sesión con el
anchor, la ventana de KYC y el seguimiento del estado. Es el mismo código que correría en
producción.

**De demostración:** el activo. El anchor de referencia solo mueve los suyos (SRT, USDC,
XLM), así que el retiro no sale del saldo en soles de la app. En producción el activo es
el PEN de Anclap.

Dicho de otro modo: **cambia el anchor y el activo, no el código.** La pantalla lo dice
en su propio aviso, para que nadie se confunda.

---

## Qué falta para el dinero real

1. **Acuerdo con Anclap** y KYC activado. Es comercial, no técnico.
2. **Confirmar que Anclap soporta SEP-45.** Si solo tiene SEP-10, los usuarios con
   passkey no pueden identificarse y haría falta otra pieza. Es la pregunta abierta.
3. **Desplegar en mainnet.** El escrow ya es agnóstico al activo: el token es un
   parámetro de `init`, así que apuntar al PEN de Anclap no cambia el contrato.
4. **Del lado del cobro**, una pasarela con Yape (Culqi, Izipay, Mercado Pago o PayU)
   para que la recarga deje de ser simulada. Requiere RUC y convenio.

Lo que **no** hace falta: que Masi obtenga licencia para emitir dinero. Ese es el negocio
de Anclap, y por eso se integra en vez de reconstruirlo.

---

## Cómo probarlo

1. Entra como profesional en `https://masiapp.vercel.app` y ve a **Perfil → Retirar tu dinero**.
2. Pulsa **Retirar a mi banco**. Te pedirá la huella: esa es la identificación SEP-45.
3. Se abre **Abrir la ventana segura**, que es el KYC del anchor, en otra pestaña.
4. El estado del retiro se actualiza solo cada cuatro segundos.

Si la huella falla o el anchor no responde, la pantalla lo dice y el botón vuelve a estar
disponible. Nada queda a medias.
