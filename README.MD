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

## Estado

En construcción. Entrega el 25 de septiembre de 2026.

Implementación del 20 de septiembre:

- **P1:** contrato en `contracts/escrow`, flujo principal de pagos, autorización,
  eventos y almacenamiento persistente. Las firmas de `dispute`, `resolve` y
  `rate` están disponibles y devuelven `NotImplemented` hasta el siguiente frente.
- **P3:** búsqueda React + Vite en `frontend`, ocho perfiles de prueba, filtros por
  oficio y distrito y calificaciones con la misma forma de `rating_of`.
- **Interfaz compartida:** [`shared/escrow.ts`](./shared/escrow.ts) contiene los
  nueve estados, `Job`, los argumentos públicos y el resumen de calificaciones.

La búsqueda muestra datos ficticios. Aún no está conectada a un contrato desplegado.
Passkeys, relayer y pantallas del flujo de trabajo corresponden a P2/P4.

## Ejecutar en local

Con Node.js 24 y npm instalados:

```sh
cd frontend
npm ci
npm run dev
```

El servidor muestra la dirección local al arrancar. Para encontrar el caso del
video, elige **Pintura** y **Surco**: aparece **Juan**, con precio referencial
**S/1,200**. La ficha breve describe el servicio; contratar y pagar pertenecen al
flujo de P4.

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

P3 consume `RatingSource.rating_of(provider)`. Para conectar la cadena, sustituir
la fuente mock por un adaptador que devuelva el resultado decodificado y asociar
los perfiles con direcciones reales. No cambian las tarjetas ni el formato del
resumen. Ver [`shared/README.md`](./shared/README.md).

`auto_release`, `cancel` y `dispute` reciben `caller` además de `job_id`, para
autenticar a quien actúa. `auto_release` cuenta el plazo desde `submit` y necesita
una invocación después del vencimiento; el contrato no ejecuta tareas programadas.

## Limitaciones

- **La recarga de saldo es simulada.** En producción la haría un anchor vía SEP-24, autenticando nuestras cuentas de contrato con SEP-45. Masi nunca toca soles, y por eso no necesita licencia.
- Las calificaciones se pueden falsear, pero cada reseña falsa cuesta la comisión de un trabajo real.
- El árbitro de las disputas es Masi. Sus decisiones son públicas y solo afectan el saldo, nunca el adelanto de materiales.
- Recuperación de cuenta: depende de la sincronización de passkeys con Google o iCloud.

## Documentación

| Archivo | Qué tiene |
|---|---|
| [`masi-scope.md`](./masi-scope.md) | Alcance completo: estados, funciones del contrato, cronograma, riesgos |
| [`SETUP_AGENTES.md`](./SETUP_AGENTES.md) | Instalación del entorno y de los agentes de AI |
| [`CLAUDE.md`](./CLAUDE.md) | Reglas que los agentes deben respetar |
| [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) | Colores, tipografía y tono de voz — obligatorio antes de tocar interfaz |

## Equipo

Cuatro frentes: contrato, cuentas, marketplace, flujo e integración.
