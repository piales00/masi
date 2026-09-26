<div align="center">

<img src="frontend/public/branding/masi-logo-welcome.png" alt="Masi" width="200">

# Masi

**Tu hogar en buenas manos**

Marketplace de servicios para el hogar donde el pago queda retenido en un contrato
hasta que apruebas el trabajo, y la reputación del técnico le pertenece a él.

[![Stellar](https://img.shields.io/badge/Stellar-testnet-1E3A8A?style=for-the-badge&logo=stellar&logoColor=white)](https://stellar.expert/explorer/testnet/contract/CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL)
[![Soroban](https://img.shields.io/badge/Soroban-Rust-B45309?style=for-the-badge&logo=rust&logoColor=white)](./contracts/escrow)
[![React](https://img.shields.io/badge/React-TypeScript-2563EB?style=for-the-badge&logo=react&logoColor=white)](./frontend)
[![Passkeys](https://img.shields.io/badge/Passkeys-WebAuthn-F59E0B?style=for-the-badge&logo=webauthn&logoColor=white)](./P2_PRUEBA_PASSKEYS.md)

[![App](https://img.shields.io/badge/app-masiapp.vercel.app-000000?style=flat-square&logo=vercel&logoColor=white)](https://masiapp.vercel.app)
[![Tests](https://img.shields.io/badge/tests-534%20en%20verde-16A34A?style=flat-square)](#verificar)
[![On-chain](https://img.shields.io/badge/on--chain-83%20invocaciones%20%C2%B7%200%20errores-1E3A8A?style=flat-square)](#evidencia-on-chain-testnet)
[![Hackathon](https://img.shields.io/badge/Stellar%20Odyssey%20Per%C3%BA%202026-Open%20Build-F59E0B?style=flat-square)](https://communityfund.stellar.org/)

</div>

---

## El problema

Se te malogra el caño un martes en la noche y no tienes a quién llamar. Escribes a tus
contactos a ver si alguien conoce a alguien, y esperas. Cuando llega, no sabes quién es
ni si sabe hacerlo, y cuando se va, rezas para que haya quedado bien.

En Perú **7 de cada 10 trabajadores son informales**. El que acaba de entrar a tu casa es
uno de ellos: no hay registro, no hay historial, nada que puedas revisar antes de abrirle
la puerta.

La raíz es que **la reputación de un buen técnico muere en el círculo que lo recomienda**.
El cliente elige a ciegas cada vez, y el técnico bueno empieza de cero cada vez. Cuando la
calidad no se puede demostrar, el mercado premia al más barato.

## La solución

Publicas lo que necesitas y los técnicos te mandan su oferta. Eliges viendo el historial
real de cada uno, y tu pago **no va a su bolsillo**: queda retenido en un contrato hasta
que apruebes el trabajo.

```
Publicas  →  Recibes ofertas  →  Eliges con historial  →  Pago protegido
```

El técnico recibe un adelanto acotado para materiales al empezar, y el saldo al aprobar tú.
Si no respondes dentro del plazo de revisión, el saldo se libera solo. Si algo sale mal, la
disputa congela el saldo y un árbitro lo reparte, **sin tocar nunca el adelanto de materiales**.

## Por qué blockchain, y por qué Stellar

Solo dos cosas viven en la cadena, y son exactamente las dos donde «confía en nosotros» es
una respuesta débil:

| | Por qué no puede ser una base de datos |
|---|---|
| **El dinero** | Retener el pago de un tercero es custodiar dinero ajeno. Si el saldo viviera en nuestro servidor, Masi sería una entidad financiera regulada. El contrato lo retiene **en vez de nosotros**. |
| **La reputación** | En una base de datos las estrellas son nuestras: las podríamos editar, borrar o vender. En el contrato son del técnico, y no existe ninguna función para cambiarlas, tampoco para el administrador. |

Todo lo demás —catálogo, solicitudes, fotos, mensajes— vive fuera de la cadena, porque una
base de datos lo hace mejor.

Stellar en concreto porque el costo por trabajo es de **céntimos**, la liquidación es de
segundos, y es la única red con anchors regulados emitiendo moneda local ya en producción.

| Pieza | Para qué |
|---|---|
| Contrato `escrow` en Soroban (Rust) | Retiene el pago y reparte materiales, saldo y comisión |
| Storage persistente con TTL extendido | Calificaciones e historial que nadie puede borrar ni inventar |
| Stellar Asset Contract | Los saldos, en soles |
| Passkeys sobre contratos de cuenta | Entrar y aprobar con la huella, sin contraseña ni frase semilla |
| Relayer | Patrocina la comisión de red: el usuario nunca necesita XLM |
| Anchor vía SEP-1 / SEP-24 / SEP-45 | La salida a una cuenta bancaria |

**El usuario nunca ve una wallet, nunca escribe una frase semilla y nunca necesita XLM.**
Entra, toca su huella y paga. Todos los montos están en soles.

Los diagramas y el razonamiento completo: [`ARQUITECTURA.md`](./ARQUITECTURA.md).

## Evidencia on-chain (testnet)

### [`CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL`](https://stellar.expert/explorer/testnet/contract/CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL)

| | |
|---|---|
| Explorador | https://stellar.expert/explorer/testnet/contract/CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL |
| SAC de PEN-test | [`CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC`](https://stellar.expert/explorer/testnet/contract/CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC) |
| Hash del WASM | `786f21b988ce6c15e1ab7b0c5edbc3c5ee6e110ba301539a3fa275fe0318d73d` |
| Red | `Test SDF Network ; September 2015` · RPC `https://soroban-testnet.stellar.org` |
| Desplegado | 21/09/2026 por `GBGZZ3XKNJSMX3MNXB2J26WVV76ZJAKKOH2C35ZF5G4W2COZAMC7I77C` |
| Actividad | **83 invocaciones · 81 eventos · 0 errores** |

El caso del demo está ejecutado de punta a punta en la red, no solo en tests: María paga
S/ 1.260, Juan cobra S/ 1.200 (S/ 360 de materiales al iniciar y S/ 840 al aprobar), Masi
cobra S/ 60 de comisión y el contrato queda en cero. Los hashes de cada transacción están
en [`DESPLIEGUE.md`](./DESPLIEGUE.md), verificables por cualquiera en el explorador.

## Estado

Entregado el **25 de septiembre de 2026**. App en producción: **https://masiapp.vercel.app**

| Frente | Estado |
|---|---|
| **Contrato** | Las doce funciones de escritura implementadas y probadas en red, incluida la disputa: `dispute` congela el saldo y `resolve` lo reparte sin tocar el adelanto de materiales. |
| **Cuentas** | Passkeys funcionando en Android real sobre el dominio definitivo, con relayer patrocinando la comisión de red. |
| **Marketplace** | Flujo completo de cliente y profesional: solicitudes, ofertas, contratación, fotos de disputa, reseñas y perfil con historial on-chain. |
| **Retiro** | Flujo de anchor implementado contra el anchor de referencia de Stellar. Bloqueado por SEP-45, que sigue en borrador — detalle en [`RETIRO_ANCHOR.md`](./RETIRO_ANCHOR.md). |

Estado detallado por frente: [`AVANCE.md`](./AVANCE.md).

## Ejecutar en local

Con Node.js 24 y npm:

```sh
cd frontend
npm ci
npm run dev
```

El servidor muestra la dirección local al arrancar.

### Verificar

```sh
cd frontend && npm test && npm run build     # 512 tests
```

Contrato, desde la raíz, con Rust, Stellar CLI 28 y el target `wasm32v1-none`:

```sh
cargo fmt --all -- --check
cargo test --workspace --locked              # 22 tests
stellar contract build --locked
```

Ninguno de estos comandos despliega nada ni crea cuentas en la red. El contrato vive en
[`contracts/escrow/src/lib.rs`](./contracts/escrow/src/lib.rs); los roles, límites y
eventos están documentados en el propio código y en [`INTEGRACION.md`](./INTEGRACION.md).

## Limitaciones

Están aquí a propósito, porque un proyecto que no las declara no es más sólido, solo es
menos honesto.

- **La recarga de saldo es simulada.** En producción la haría un anchor vía SEP-24,
  autenticando nuestras cuentas de contrato con SEP-45. Masi nunca toca soles, y por eso
  no necesita licencia.
- **El retiro real está bloqueado río arriba.** SEP-45, el estándar que permite a una
  cuenta con passkey identificarse ante un anchor, sigue en borrador.
- Las calificaciones se pueden falsear, pero **cada reseña falsa cuesta la comisión de un
  trabajo real**.
- El árbitro de las disputas es Masi. Sus decisiones solo afectan el saldo, nunca el
  adelanto de materiales, y se resuelven desde un panel interno que exige una clave de
  servidor (`ARBITER_PANEL_KEY`).
- La recuperación de cuenta depende de la sincronización de passkeys con Google o iCloud.
- La API compartida de la demo no tiene autenticación. El dinero y el estado de los
  trabajos siguen protegidos por el contrato; solicitudes, ofertas y texto de reseñas viven
  temporalmente en Upstash Redis.

## Documentación

| Archivo | Qué tiene |
|---|---|
| [`ARQUITECTURA.md`](./ARQUITECTURA.md) | Diagramas: qué vive en la cadena y qué no, y por qué |
| [`DESPLIEGUE.md`](./DESPLIEGUE.md) | Contract ID, hashes y cómo reproducir el despliegue |
| [`INTEGRACION.md`](./INTEGRACION.md) | Cómo conectar el frontend al contrato, con las trampas típicas |
| [`RETIRO_ANCHOR.md`](./RETIRO_ANCHOR.md) | Cómo sale el dinero: retiro por anchor y ruta a Anclap |
| [`PRUEBA_E2E.md`](./PRUEBA_E2E.md) | Prueba de punta a punta con dos teléfonos |
| [`P2_PRUEBA_PASSKEYS.md`](./P2_PRUEBA_PASSKEYS.md) | Cómo probar las passkeys |
| [`AVANCE.md`](./AVANCE.md) | Estado del proyecto por frente |
| [`masi-scope.md`](./masi-scope.md) | Alcance completo: estados, funciones, cronograma, riesgos |
| [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) | Colores, tipografía y tono — obligatorio antes de tocar interfaz |
| [`CLAUDE.md`](./CLAUDE.md) | Reglas que los agentes deben respetar |

## Equipo

| | Rol |
|---|---|
| **Alessandro** | CEO · Contrato y arquitectura |
| **Jossep** | CTO · Backend e integración |
| **Samuel** | Producto y diseño · Frontend |
| **Valentino** | Product Owner · Estrategia y operaciones |

<div align="center">

**Hackathon Stellar Odyssey Perú 2026 · Track 6 · Open Build**

</div>
