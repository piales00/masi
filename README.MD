# Masi

> *Tu hogar en buenas manos*

Marketplace de servicios donde todo pago va protegido. El cliente bloquea el dinero en un contrato Soroban, el trabajador recibe un adelanto para materiales al empezar y el saldo al aprobar. Las calificaciones solo las puede dejar quien pagó por el contrato.

**Hackathon Stellar Odyssey Perú 2026** · Track 6 · Open Build

---

## El problema

María busca un pintor en Surco. Encuentra a Juan, acuerdan S/1,200 por pintar su departamento. Ninguno confía en el otro: si María paga por adelantado, Juan puede desaparecer; si Juan empieza sin cobrar, puede quedarse sin pago. Y las estrellas del perfil de Juan no significan nada, porque cualquiera puede escribir una reseña.

## La solución

El dinero lo retiene un contrato, no nosotros. Juan recibe el 30% al empezar para comprar materiales, y el resto cuando María aprueba. Si María no responde, el saldo se libera solo. Y solo quien pagó por un trabajo puede calificarlo — inventar una reseña cuesta la comisión de un trabajo real.

## Por qué blockchain, y por qué Stellar

Usamos blockchain porque el dinero y las reseñas no pueden quedar bajo el control de la plataforma. Y Stellar porque tiene stablecoins nativas, rampas a dinero real y passkeys.

El usuario nunca ve una wallet, nunca escribe una frase semilla y nunca necesita XLM. Entra, toca su huella, y paga.

| Pieza | Para qué |
|---|---|
| Contrato Soroban `escrow` | Retiene el dinero y reparte materiales / saldo / comisión |
| Storage persistente | Reseñas e historial que no podemos borrar ni inventar |
| SAC + token | Todo movimiento de dinero |
| Passkeys + contrato de cuenta | Pagar y aprobar con huella, sin wallet |
| Relayer | El usuario nunca necesita XLM |

Solo dos cosas viven en la cadena —retener el dinero y guardar quién calificó qué—
y son exactamente las dos donde "confía en nosotros" es una respuesta débil. Todo
lo demás está fuera, porque una base de datos lo hace mejor. Los diagramas y el
razonamiento completo: [`ARQUITECTURA.md`](./ARQUITECTURA.md).

## Estado

En construcción. Entrega el 25 de septiembre de 2026.

**Desplegado y funcionando en testnet:**

| | |
|---|---|
| App | https://masiapp.vercel.app |
| Contrato `escrow` | [`CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL`](https://stellar.expert/explorer/testnet/contract/CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL) |
| SAC de PEN-test | `CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC` |

El caso del demo está ejecutado de punta a punta en la red, no solo en tests: María
paga S/1.260, Juan cobra S/1.200 (S/360 de materiales al iniciar y S/840 al
aprobar), Masi cobra S/60 de comisión y el contrato queda en cero. Los hashes de
cada transacción están en [`DESPLIEGUE.md`](./DESPLIEGUE.md), verificables por
cualquiera en el explorador.

**Contrato** — 22/22 tests. Las doce funciones de escritura están implementadas y
probadas en red, incluida la disputa: `dispute` congela el saldo y `resolve` lo
reparte entre técnico y cliente, sin tocar nunca el adelanto de materiales.

**Cuentas** — passkeys verificadas en un Android real: se desplegó una smart wallet
con huella. Falta repetirlo en el dominio definitivo e integrar el relayer.

**Frontend** — PWA móvil con el onboarding completo, publicación de solicitudes y
listado de profesionales. Las calificaciones usan datos de prueba con la misma
forma que devuelve el contrato; `frontend/src/dataSource.ts` es el único punto a
cambiar para conectarlo.

Estado detallado por frente: [`AVANCE.md`](./AVANCE.md).

## Ejecutar en local

Con Node.js 24 y npm instalados:

```sh
cd frontend
npm ci
npm run dev
```

El servidor muestra la dirección local al arrancar. El caso del vídeo es **Juan**,
pintor en **Surco**, con precio referencial **S/1.200**.

Verificar frontend:

```sh
cd frontend
npm test
npm run build
```

Verificar contrato desde la raíz, con Rust, Stellar CLI 28 y el target `wasm32v1-none`:

```sh
cargo fmt --all -- --check
cargo test --workspace --locked
stellar contract build --locked
```

Los detalles de inicialización, roles, límites y eventos están en
[`contracts/escrow/README.md`](./contracts/escrow/README.md). No hay despliegue ni
cuentas de red creadas por estos comandos.

Con SDK 28, la compilación WASM se hace con `stellar contract build`, que aplica
la configuración requerida por el runtime ([documentación del SDK](https://docs.rs/soroban-sdk/28.0.0/soroban_sdk/)).

## Conectar los frentes

`frontend/src/dataSource.ts` es el único punto a cambiar: exporta un `RatingSource`
que hoy devuelve datos de prueba y mañana leerá del contrato. La forma ya es la
misma, así que es una línea. La guía completa, con las reglas que evitan los
errores típicos —stroops, `bigint`, direcciones C, errores traducidos— está en
[`INTEGRACION.md`](./INTEGRACION.md).

`auto_release`, `cancel` y `dispute` reciben `caller` además de `job_id`, porque
admiten más de un rol y `require_auth` no puede adivinar a quién exigirle la firma.
`auto_release` cuenta el plazo desde `submit` y necesita una invocación después del
vencimiento: el contrato no ejecuta tareas programadas.

## Limitaciones

- **La recarga de saldo es simulada.** En producción la haría un anchor vía SEP-24, autenticando nuestras cuentas de contrato con SEP-45. Masi nunca toca soles, y por eso no necesita licencia.
- Las calificaciones se pueden falsear, pero cada reseña falsa cuesta la comisión de un trabajo real.
- El árbitro de las disputas es Masi. Sus decisiones son públicas y solo afectan el saldo, nunca el adelanto de materiales.
- Recuperación de cuenta: depende de la sincronización de passkeys con Google o iCloud.

## Documentación

| Archivo | Qué tiene |
|---|---|
| [`ARQUITECTURA.md`](./ARQUITECTURA.md) | Diagramas: qué vive en la cadena y qué no, y por qué |
| [`AVANCE.md`](./AVANCE.md) | Estado del proyecto por frente |
| [`DESPLIEGUE.md`](./DESPLIEGUE.md) | Contract ID, hashes y cómo reproducir el despliegue |
| [`INTEGRACION.md`](./INTEGRACION.md) | Cómo conectar el frontend al contrato |
| [`masi-scope.md`](./masi-scope.md) | Alcance completo: estados, funciones del contrato, cronograma, riesgos |
| [`SETUP_AGENTES.md`](./SETUP_AGENTES.md) | Instalación del entorno y de los agentes de AI |
| [`CLAUDE.md`](./CLAUDE.md) | Reglas que los agentes deben respetar |
| [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) | Colores, tipografía y tono de voz — obligatorio antes de tocar interfaz |

## Equipo

Cuatro frentes: contrato, cuentas, marketplace, flujo e integración.
