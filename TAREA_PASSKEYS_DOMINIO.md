# Tarea — Passkeys en el dominio definitivo

**Para P2.** Continúa [`P2_PRUEBA_PASSKEYS.md`](./P2_PRUEBA_PASSKEYS.md), que tiene el contexto y las trampas. Esto es solo el siguiente paso.

## Objetivo

Que al final del día existan **dos direcciones `C…` creadas con huella en `https://masiapp.vercel.app`**: una para María (cliente) y otra para Juan (proveedor).

Eso es todo. No hace falta que la app esté bonita ni completa.

## Por qué justo esas dos

Son las únicas cuentas que actúan en el vídeo. Los otros siete proveedores de prueba no firman nada y no necesitan wallet.

Y hay una dependencia que manda: el **24 se siembra el historial de Juan** —los trabajos y calificaciones que hacen que su perfil sea verificable— y hay que sembrarlo **contra su dirección definitiva**. Si su wallet no existe antes, no hay a qué colgar el historial, y el perfil sale vacío justo en la primera escena del vídeo.

## Por qué tiene que ser ese dominio y no otro

La prueba del 20 funcionó, pero se hizo en `prismatic-crumble-a96f0e.netlify.app`. Una passkey pertenece al origen exacto donde se creó, así que **esa cuenta no sirve en el nuestro**.

Lo bueno: lo que se cree en `masiapp.vercel.app` **sí vale para siempre**, aunque lo cree una versión provisional de la app. La passkey se ata al dominio, no a la pantalla. Las wallets que saques hoy siguen sirviendo cuando la app esté terminada.

---

## Pasos

### 1. Meter `passkey-kit` en la app real

```bash
npm install passkey-kit          # Node 22+
```

El sitio ya tiene pantallas de **Acceso** y **Configuración** en el onboarding; ahí es donde encaja "crear cuenta". No hace falta inventar pantalla nueva.

Configuración del cliente (todo esto es público, puede ir en el bundle):

```ts
rpcUrl: 'https://soroban-testnet.stellar.org'
networkPassphrase: 'Test SDF Network ; September 2015'
walletWasmHash: '97ce047884106b1c6c3bb40b8973cc48db1c4dad95c9e20462bf2c701daa764e'
```

### 2. El relayer, en una Vercel Function

La clave del relayer **no puede ir en el navegador**. Nada que empiece por `VITE_` sirve: se empaqueta en el bundle y queda público.

Como ya estamos en Vercel, lo natural es una **Vercel Function** que reciba la transacción firmada y la reenvíe. La clave se configura como variable de entorno en el panel de Vercel, no en el repo.

Conseguir la clave:

```bash
curl https://channels.openzeppelin.com/testnet/gen
# → {"apiKey":"..."}
```

Del lado servidor se usa `passkey-kit/server` (`PasskeyServer`), que es el que sabe hablar con el relayer. Nunca se importa desde código de navegador.

### 3. El flujo de creación

```ts
const created = await kit.createWallet('Masi', usuario);   // pide huella (registro)
const result  = await server.send(created.signedTx);       // via la Function
if (!result.success) throw result.error;
await kit.confirmWalletCreation(created, result.hash);     // NO pide huella
```

**Ojo con la segunda huella.** `connectWallet` pide una segunda ceremonia y por eso en la prueba del 20 parecía que "te identifica dos veces". No lo llames justo después de registrar: deja entrar al usuario y pide la huella recién cuando vaya a pagar. Así la segunda ceremonia *es* la firma del pago, y no un trámite repetido.

### 4. Crear las dos cuentas

Desde un celular real, en `https://masiapp.vercel.app`:

- [ ] Registrar **María** → apuntar su dirección `C…` y el hash del despliegue.
- [ ] Registrar **Juan** → apuntar su dirección `C…` y el hash del despliegue.

Usa la URL principal. **Nunca** una URL de preview de Vercel (`masiapp-git-…vercel.app`): es otro origen y la cuenta no valdría.

---

## Qué entregar

- [ ] La dirección `C…` de María.
- [ ] La dirección `C…` de Juan.
- [ ] Los dos hashes de despliegue (van al README).
- [ ] Confirmar que el relayer pagó las comisiones y que **en ningún momento hizo falta XLM**.
- [ ] Si algo hubo que configurar a mano (por ejemplo `rpId`), anotarlo.

Con esas dos direcciones se desbloquea la siembra del 24.

## Si algo falla

Apúntalo y sigue: la decisión de fallback es el 22 por la noche y se toma con lo que haya. Un "no funciona y esto es lo que salió" a tiempo vale más que un intento perfecto tarde.

Recuerda que **"Create wallet failed" puede mentir**: si el registro de actividad muestra `Deploy wallet ✓` con su hash, la wallet existe aunque salga el mensaje rojo. Lo que falla en ese caso es la segunda ceremonia. Usa "Sign in (passkey)" en vez de crear otra, o quedan cuentas huérfanas.

## Lo que NO es esta tarea

- No hay que conectar el contrato de escrow. Eso es de P4 y está en [`INTEGRACION.md`](./INTEGRACION.md).
- No hay que crear wallets para los otros siete proveedores. No firman nada.
- No hay que probar en iPhone todavía. Primero que funcione en el dominio bueno.
