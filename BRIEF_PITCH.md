# Brief para generar el PPT — Masi

Este documento es el contexto para que un generador de presentaciones diseñe el deck.
**No dicta el diseño**: da los hechos, las restricciones y el tono. Las decisiones visuales
—composición, jerarquía, ilustraciones— las toma quien genera.

---

## El encargo en una línea

Un deck de **3 o 4 diapositivas** para un pitch de **3 minutos** en un hackathon, que deje
**espacio reservado para insertar después, en edición, un vídeo del celular usando la app**.

---

## Restricciones duras

1. **Tres o cuatro diapositivas. Ni una más.** Son 3 minutos: a 45–60 segundos por diapositiva.
2. **Al menos dos diapositivas reservan un hueco vertical para el celular.** Un rectángulo
   vacío con proporción de teléfono (**9:19,5**, tipo 420×910 px sobre un lienzo de 1920×1080),
   colocado a un lado, con el contenido de texto en el otro. Ese hueco se rellena en edición de
   vídeo: **déjalo vacío o con un marcador plano**, sin maquetas de interfaz dibujadas, sin
   marcos de teléfono decorativos y sin sombras que estorben al recortar.
3. **Nada de inventar cifras.** Solo se usan las que están más abajo. Si hace falta un dato que
   no está, se omite.
4. **Nada de jerga cripto en el texto de las diapositivas**: no aparecen *wallet*, *gas*,
   *seed phrase* ni *XLM*. Los montos van en soles (S/). "Blockchain" y "Stellar" sí pueden
   aparecer cuando se habla de la tecnología, no del producto.
5. Idioma: **español de Perú**, tuteo.

---

## Qué es Masi

Un **marketplace de servicios para el hogar** —gasfitería, electricidad, pintura, cerrajería—
donde el pago del cliente **queda retenido en un contrato inteligente** hasta que el trabajo
esté aprobado.

Está construido sobre **Stellar**, con contratos **Soroban**.

### El problema que resuelve

Contratar a alguien para tu casa en Perú se sostiene solo con confianza, y las dos partes
pierden:

- **Quien contrata** teme adelantar el dinero de los materiales y que el técnico no vuelva.
- **Quien trabaja** teme poner los materiales de su bolsillo y que luego no le paguen.

Hoy nada lo garantiza. Esa desconfianza mutua es el problema.

### Cómo funciona, con números reales del caso de demostración

El cliente paga **S/ 1.260** y el dinero entra al contrato. **Nadie puede tocarlo**: ni Masi, ni
el cliente, ni el técnico. Sale en tres partes:

| Momento | Cuánto | A quién |
|---|---|---|
| Al iniciar el servicio | **S/ 360** | Al técnico, para materiales |
| Al aprobar el cliente | **S/ 840** | Al técnico, el resto |
| Al cerrarse el trabajo | **S/ 60** | A Masi, comisión del 5 % |

Reglas que conviene mencionar si cabe:

- Si el cliente **no responde en 24 horas**, el pago se libera solo.
- El adelanto de materiales **nunca se disputa**: una vez entregado, ya es del técnico.
- El adelanto está **topado al 50 %** del total.

### Cuando hay desacuerdo

Cualquiera de las dos partes reporta el problema **con su versión escrita y fotos como prueba**.
El saldo **queda congelado** en el contrato. Un árbitro ve **las dos versiones enfrentadas** con
sus pruebas y decide el reparto. El adelanto de materiales no entra en ese reparto.

### Lo que de verdad nos diferencia

**Parece una app normal, no una app cripto.** Este es el argumento más fuerte del pitch:

- Se entra **con la huella** del celular. Cada cuenta es una smart wallet con *passkey*.
- **No hay frase semilla** que anotar ni guardar.
- **Todo está en soles.** La palabra "blockchain" no aparece en ninguna pantalla.
- **El usuario no paga comisiones de red**: la app las cubre por él, así que nadie necesita
  comprar nada para empezar.
- La **reputación del técnico vive en la cadena**: estrellas y trabajos completados que
  cualquiera puede verificar sin fiarse de nosotros.

---

## Cifras verificadas — las únicas que se pueden usar

| Dato | Valor |
|---|---|
| Trabajos completos pagados y liberados en la cadena | **5** |
| Disputas resueltas por un árbitro | **1**, repartida 70 / 30 |
| Pruebas automatizadas en verde | **526** (22 del contrato, 504 de la aplicación) |
| Comisión de Masi | **5 %** |
| Plazo de revisión del cliente | **24 horas** |
| App desplegada | `masiapp.vercel.app` |
| Contrato en testnet | `CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL` |

Todo esto está **hecho y funcionando**, firmado con huellas reales en dos teléfonos distintos.
No es una maqueta.

---

## El camino a producción

Vale la pena cerrar con esto, porque responde a la pregunta que siempre hace un jurado:
*"¿y esto cómo llega a ser real?"*.

- **El contrato ya está listo.** La moneda es un **parámetro**, no una constante: apuntarlo a
  soles reales no cambia una línea de código.
- **Los soles ya existen en Stellar.** **Anclap** emite PEN respaldado, con retiro a cuenta
  bancaria.
- **Lo que falta no es nuestro**: SEP-45, el estándar que permite a las cuentas con huella
  identificarse ante un banco, todavía está en borrador. Es honesto decirlo.

Frase de cierre sugerida, se puede reescribir:
*"El gasfitero de tu barrio ya puede cobrar sin pedirle confianza a nadie."*

---

## Identidad visual

Solo la paleta y la tipografía. **La composición es libre.**

| Color | Hex | Uso |
|---|---|---|
| Azul marino | `#1E3A8A` | Principal, fondos oscuros, títulos |
| Azul | `#2563EB` | Acciones, acentos |
| Naranja | `#F59E0B` | Acento, solo en detalles |
| Crema | `#FEF3C7` | Avisos suaves |
| Gris claro | `#E5E7EB` | Bordes, separadores |
| Fondo claro | `#F8FAFF` | Fondo de las diapositivas claras |
| Texto | `#1F2937` / `#6B7280` | Cuerpo y texto secundario |

**Tipografía: Montserrat.** Es la de la app.

Tono: **cálido y directo**, cercano a un vecino, no corporativo. Masi significa "amigo" en
quechua, y el producto va de confianza entre personas.

---

## Qué evitar

- Diapositivas cargadas de texto. El presentador habla; la diapositiva acompaña.
- Maquetas de teléfono dibujadas: **ese espacio es para el vídeo real**.
- Iconos de blockchain, cadenas, candados, monedas flotantes. El producto no se ve así.
- Gradientes llamativos y sombras dramáticas.
- Estadísticas de mercado inventadas.

---

## Contexto de la presentación

- **Evento:** Stellar Odyssey Perú 2026, track 6 (Open Build).
- **Formato:** pitch de 3 minutos, presencial y virtual. La **demo va aparte y dura más**, así
  que el deck **no tiene que enseñar la app entera**: basta con dar el contexto para que la demo
  se entienda.
- **Audiencia:** jurado técnico y de negocio.
