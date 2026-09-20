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

**La clave va en `.env`, nunca en el repo.** Añade `.env` a `.gitignore` antes de guardarla.

```typescript
import * as RPChannels from "@openzeppelin/relayer-plugin-channels";

const client = new RPChannels.ChannelsClient({
  baseUrl: "https://channels.openzeppelin.com/testnet",
  apiKey: import.meta.env.VITE_RELAYER_API_KEY,
});

const response = await client.submitSorobanTransaction({
  func: contractFunc,
  auth: contractAuth,
});
```

El relayer usa el mecanismo nativo de fee bump de Stellar, así que el usuario nunca necesita XLM. Reemplaza a Launchtube, que está deprecado: **si encuentras un ejemplo con Launchtube, está viejo.**

Restricción del scope que hay que implementar: el relayer **solo acepta llamadas a nuestro contrato y al SAC de PEN-test**. No es configuración del servicio hosteado; es una comprobación que hacemos nosotros antes de enviar.

Para producción se autohospeda con Docker ([GitHub](https://github.com/OpenZeppelin/openzeppelin-relayer)). En el hackathon no hace falta.

---

## Lo que queda por hacer a mano en la ventana de 3 horas

La verificación de arriba es de escritorio. Lo que sigue solo se comprueba ejecutando:

- [ ] Correr el ejemplo de `passkey-kit` en **testnet** y confirmar que despliega un contrato de cuenta (dirección C).
- [ ] Registrar una passkey y firmar una transacción de punta a punta con el relayer.
- [ ] Probarlo en un **celular real hoy**, no el 22. En `localhost` las passkeys funcionan sin HTTPS, así que el riesgo recién aparece al salir del escritorio.
- [ ] Confirmar que el flujo `__check_auth` valida la firma secp256r1.

Referencia obligada: el [tutorial del Guestbook](https://developers.stellar.org/docs/build/apps/guestbook) de los docs oficiales — es passkey-kit con el mismo patrón que Masi (smart wallet por usuario, direcciones C). La sección [Passkeys Prerequisites](https://developers.stellar.org/docs/build/apps/guestbook/passkeys-prerequisites) cubre el lookup inverso de passkey a dirección de smart wallet.

Y el flujo de [Embedded Wallets del SDP](https://developers.stellar.org/docs/platforms/stellar-disbursement-platform/admin-guide/embedded-wallets), que es exactamente nuestro patrón: transferencia SAC a una wallet de contrato, comisión patrocinada, receptor que no paga nada. Vale para P1 también.

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
