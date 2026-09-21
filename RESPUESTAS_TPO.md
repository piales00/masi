# Respuestas del TPO a `MASI_flujos_para_TPO.md`

**21 de septiembre de 2026.** Cada respuesta sobre el contrato está comprobada contra el código de `contracts/escrow/` y contra el despliegue en testnet, no de memoria.

Resumen: **la propuesta del PO de separar oferta y cotización final se acepta y no toca el contrato.** Lo que sí hay que decidir hoy es si se construye `dispute`, porque añadirlo cambia el contract ID.

---

## Sobre la propuesta de la sección 4

**Se acepta.** Las ofertas sirven para elegir al técnico, y el escrow nace con la cotización final, después de la visita. Al contrato le da igual cómo se llegó al monto: `create_job` recibe un cliente, un proveedor y un monto. **No cambia ni una línea del contrato.**

La secuencia on-chain que queda, a partir de que el cliente acepta la cotización:

| Paso | Función | Firma |
|---|---|---|
| Cliente acepta la cotización | `create_job` | cliente |
| Técnico confirma | `accept` | técnico |
| Cliente paga | `fund` | cliente |
| Técnico inicia (recibe materiales) | `start` | técnico |
| Técnico termina | `submit` | técnico |
| Cliente aprueba | `approve` | cliente |
| Cliente califica | `rate` | cliente |

Un detalle para las pantallas: el cliente firma **dos veces** seguidas con el técnico en medio (`create_job`, luego el técnico `accept`, luego `fund`). El contrato no deja pagar un trabajo que el técnico no confirmó. Como el técnico ya cotizó, su `accept` debe verse como "confirma con tu huella", no como otra negociación.

---

## Las diez preguntas

### 1. ¿Dónde viven las solicitudes, las ofertas y "mis trabajos"?

**Hoy, en el `localStorage` del navegador.** Por eso lo que publica un usuario **no se ve en el teléfono del otro**: solo se comparten dentro del mismo navegador.

Hay que partirlo en dos, porque son dos cosas distintas:

- **Lo que ya es un trabajo** (desde `create_job`): vive en el contrato. `get_job` y `jobs_of` lo devuelven a cualquier dispositivo. Esto ya está resuelto.
- **Lo que todavía no es un trabajo** (solicitud, ofertas, cotización, texto de las reseñas): necesita un almacén compartido fuera de la cadena.

Recomendación: **Vercel Blob detrás de una Vercel Function.** Ya estamos en Vercel y el relayer también va a necesitar una Function, así que no suma servicios nuevos. Si no llega a tiempo, el plan B es grabar el vídeo con los dos roles en el mismo dispositivo, que es lo que hoy funciona.

**Decisión que falta:** cuál de las dos. Condiciona la pregunta 8.

### 2. ¿`create_job` puede dispararse con la cotización final?

**Sí.** Ver arriba. No hay que tocar el contrato.

### 3. ¿Qué pasa si acuerdan otro monto después de crear el trabajo?

**El monto no se puede cambiar.** No existe ninguna función para modificarlo, a propósito: "un precio que no se renegocia" es parte de la promesa al técnico.

Lo que sí se puede hacer depende de en qué punto están:

| Estado | Salida |
|---|---|
| Antes de iniciar (`Requested`, `Accepted`, `Funded`) | `cancel`: reembolso completo si ya pagó. Se crea un trabajo nuevo con el monto correcto |
| Después de iniciar | El adelanto ya se entregó y es irreversible. Solo queda `dispute`, que no existe |

**Para el hallazgo imprevisto en plena obra, la respuesta limpia es un segundo trabajo** por la parte extra. No toca el primero, queda en el historial, y el cliente paga lo nuevo con la misma protección. Es lo que conviene contar en el pitch.

### 4. ¿Acepta un trabajo pequeño, como un diagnóstico, con materiales en cero?

**Sí.** Las únicas condiciones son monto mayor que cero, plazo de revisión mayor que cero y descripción no vacía. `materials_bps = 0` es válido: `start` no transfiere nada y todo se cobra al aprobar.

Un diagnóstico de S/20 con 5 % de comisión da S/1 de comisión, sin problemas de redondeo.

### 5. ¿`materials_bps` se fija por trabajo? ¿Y si los materiales superan el 50 %?

**Sí, se fija en cada `create_job`**, así que la opción A del PO funciona tal cual: `materials_bps = materiales ÷ total × 10.000`, redondeado hacia abajo. El redondeo no pierde dinero: el sobrante va en el pago final al técnico.

**Por encima de 5.000 el contrato rechaza con `InvalidBps`.** La pantalla tiene que topar el valor en 50 % antes de enviarlo, y mostrar que el técnico pone la diferencia, como decidió el PO. Coincido en que hay que decir en el README que el gasto real de materiales no se verifica.

### 6. `auto_release`: ¿a quién libera?

**Al técnico el saldo, y a Masi la comisión.** Exactamente igual que `approve`. Lo puede disparar **cualquiera** una vez vencido el plazo, contado desde que el técnico marca "terminado". Está probado en testnet con una cuenta ajena al trabajo.

**El PO tiene razón: sin `dispute`, el cliente no tiene forma de frenarlo.** Si no aprueba porque el trabajo está mal, el dinero sale igual al vencer el plazo. Mientras no exista `dispute`, la única defensa es un plazo de revisión largo (por ejemplo 72 h) para que el cliente alcance a reclamar por fuera.

### 7. ¿Cuánto cuesta un `dispute` mínimo?

**Unas tres horas con tests, más un redespliegue.** Es poco código: `dispute` pasa el trabajo a `Disputed`, y eso **ya bloquea solo** `approve` y `auto_release`, porque ambos exigen el estado `Submitted`. `resolve` reparte el saldo entre técnico y cliente según `provider_bps`, la comisión va a Masi, y suma una disputa al perfil del técnico. El adelanto de materiales nunca entra en el reparto.

**Lo que hace urgente decidirlo hoy:** el contrato no tiene función de actualización. **Añadir `dispute` obliga a redesplegar, y eso cambia el contract ID.** Si se hace después de que el frontend esté conectado o de sembrar el historial del 24, se pierde el trabajo. Hay que decidirlo **antes** de conectar.

Coincido con el PO: sin `dispute`, `auto_release` es unilateral, y eso es justo lo primero que preguntaría un jurado. Recomendación: **construirlo hoy.**

### 8. ¿Cómo se hace el demo con dos roles?

Depende de la pregunta 1:

- **Con almacén compartido:** dos teléfonos, uno por rol. Es lo más convincente en vídeo.
- **Sin él:** un solo dispositivo, cambiando de rol en la misma sesión del navegador. Funciona hoy, pero en el vídeo se nota.

Las passkeys no son obstáculo: cada rol tiene su propia wallet, y un mismo teléfono puede guardar varias passkeys para el mismo dominio.

### 9. ¿Dónde se guarda el texto de la reseña?

**Hoy en ninguna parte.** En la cadena queda el SHA-256 del texto, en el propio trabajo (`get_job` lo devuelve). El texto va al mismo almacén compartido de la pregunta 1.

La verificación es la gracia: cualquiera recalcula el hash del texto mostrado y lo compara con el de la cadena. Si alguien editara la reseña, dejaría de coincidir.

### 10. Nombres exactos de las funciones

| Paso del diagrama | Función |
|---|---|
| Cliente acepta la cotización | `create_job` |
| Técnico confirma | `accept` |
| Cliente firma y paga | `fund` |
| Técnico inicia | `start` |
| Técnico termina | `submit` |
| Cliente aprueba | `approve` |
| Plazo vencido | `auto_release` |
| Cliente califica | `rate` |
| Cancelar antes de iniciar | `cancel` |
| Disputa | `dispute` y `resolve` |
| Lecturas | `get_job`, `jobs_of`, `rating_of` |

Para el diagrama M7: los fondos los retiene `fund`, no `create_job`. `create_job` solo registra el acuerdo.

---

## Decisiones abiertas del PO (sección 9)

Mi opinión donde afecta a la implementación:

- **Diagnóstico de S/20:** fuera del demo, como propone el PO. Si algún día pasa por el contrato, la pregunta 4 dice que ya funciona.
- **Garantía de 1 mes:** respuesta preparada para el jurado, no mecanismo. Un mecanismo real sería retener parte del pago un mes, y eso es otro contrato.
- **Modelo de ingreso:** el contrato cobra comisión por trabajo, configurable hasta 10 %. La tarifa plana no está soportada.
- **Track:** 6, Open Build, inscripción confirmada según el scope.

---

## Lo que hay que decidir hoy

1. **¿Se construye `dispute`?** Recomendación: sí, y antes de conectar el frontend, por el cambio de contract ID.
2. **¿Almacén compartido o demo en un solo dispositivo?** Recomendación: Vercel Blob.
3. **Plazo de revisión por defecto.** Recomendación: 72 h mientras no exista `dispute`.
