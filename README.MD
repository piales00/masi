# Kercado

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

## Limitaciones

- **La recarga de saldo es simulada.** En producción la haría un anchor vía SEP-24, autenticando nuestras cuentas de contrato con SEP-45. Kercado nunca toca soles, y por eso no necesita licencia.
- Las calificaciones se pueden falsear, pero cada reseña falsa cuesta la comisión de un trabajo real.
- El árbitro de las disputas es Kercado. Sus decisiones son públicas y solo afectan el saldo, nunca el adelanto de materiales.
- Recuperación de cuenta: depende de la sincronización de passkeys con Google o iCloud.

## Documentación

| Archivo | Qué tiene |
|---|---|
| [`kercado-scope.md`](./kercado-scope.md) | Alcance completo: estados, funciones del contrato, cronograma, riesgos |
| [`SETUP_AGENTES.md`](./SETUP_AGENTES.md) | Instalación del entorno y de los agentes de AI |
| [`CLAUDE.md`](./CLAUDE.md) | Reglas que los agentes deben respetar |

## Equipo

Cuatro frentes: contrato, cuentas, marketplace, flujo e integración.
