# Prueba de punta a punta con dos teléfonos

**Objetivo:** completar un trabajo entero con firmas reales de huella, contra el contrato de
testnet. Es lo único del proyecto que nunca se ha probado completo, y lo que se graba el día
del vídeo. Hazlo **antes** de grabar, no el mismo día.

Tiempo: unos 20 minutos la primera vez.

---

## Antes de empezar

**Tres reglas que, si se rompen, obligan a volver a empezar.**

1. **La URL es exactamente `https://masiapp.vercel.app`.** Nunca un enlace de preview de Vercel,
   nunca `localhost`. Una llave de acceso queda atada al dominio exacto donde se creó: si la
   creas en otra dirección, esa cuenta no entra aquí nunca más.
2. **Un teléfono, un rol.** El teléfono A es el cliente y el B el técnico, de principio a fin.
   No se puede ser los dos en el mismo aparato: la llave de acceso es una por dispositivo.
3. **El saldo va al cliente.** Es quien paga. Recargar el teléfono del técnico no sirve de nada.

**Que te pida la huella dos veces al crear la cuenta es normal.** Una para crear la llave y otra
para confirmarla. No es un fallo.

---

## Cuánto saldo hace falta

Al pagar, el contrato cobra **el total de la cotización más la comisión del 5 %**. No solo el
total. Con una cotización de S/1.200 se necesitan **S/1.260**.

La pantalla de recarga ofrece S/100, S/500 y S/1.200, y **se puede recargar varias veces**.

| Si vas a cotizar | Necesitas | Recarga |
|---|---|---|
| S/400 (recomendado para la primera prueba) | S/420 | S/500, una vez |
| S/1.200 (los números del vídeo) | S/1.260 | S/1.200 **y** S/100 |

Para la primera pasada usa números pequeños: si algo sale mal, repetir cuesta menos.

---

## Teléfono A — el cliente

### 1. Crear la cuenta

1. Abre `https://masiapp.vercel.app`.
2. Pasa la bienvenida y elige el rol **Cliente**.
3. Rellena nombre, teléfono y distrito. Pon **tu** nombre, no hace falta que sea "María".
4. Confirma con la huella. Te la pedirá dos veces.

### 2. Comprobar que la cuenta es real

Ve a **Perfil**. Debe salir una dirección que empieza por `C…` y un enlace al explorador.
Ábrelo: si el explorador la conoce, la cuenta existe de verdad en testnet.

**Apunta esa dirección.** Es la prueba de que todo lo demás es real.

### 3. Recargar saldo

Desde Inicio, **Recargar saldo**. Elige el monto de la tabla de arriba, "Ya pagué", y espera la
confirmación. Vuelve a entrar en la pantalla: el saldo debe haber subido.

Si no sube, para aquí y avisa. Sin saldo no se puede pagar.

### 4. Publicar la solicitud

Cuenta el problema en Inicio, o elige un servicio. Completa la solicitud y publícala.

---

## Teléfono B — el técnico

### 5. Crear la cuenta

1. Abre `https://masiapp.vercel.app` **en el segundo teléfono**.
2. Elige el rol **Profesional**.
3. Rellena el perfil: nombre, oficio, distrito, años de experiencia.
4. Confirma con la huella, también dos veces.

Comprueba su dirección `C…` igual que antes. **Tiene que ser distinta de la del cliente.** Si es
la misma, os habéis registrado en el mismo teléfono.

### 6. Postularse

En Alertas debe aparecer la solicitud que publicó el cliente, **en menos de 10 segundos**. Ábrela
y postúlate con un precio y una duración.

> Si no aparece: es el primer punto de fallo real. Comprueba que el teléfono A publicó de verdad
> (debe verse en su lista de solicitudes) y que ambos están en la misma URL.

---

## Los dos, por turnos

### 7. El cliente elige (teléfono A)

En el detalle de la solicitud debe verse la postulación **con el nombre real del técnico**. Donde
iría su calificación pondrá "Nuevo en Masi": es correcto, todavía no tiene historial.

Pulsa **Elegir**.

### 8. El técnico cotiza (teléfono B)

Envía la cotización final: **total** y **cuánto de eso es materiales**. Los materiales no pueden
pasar del 50 % del total; si te pasas, la app te avisa.

Ejemplo bueno para la prueba: total S/400, materiales S/120.

### 9. El cliente acepta y paga (teléfono A)

1. Revisa el desglose. Debe decir cuánto pagas en total, comisión incluida.
2. **Aceptar** → firma con la huella. Aquí nace el trabajo en el contrato.
3. Te lleva a la pantalla del trabajo. Pulsa **pagar** → firma otra vez.

Este es el momento de la verdad: el dinero sale de la cuenta del cliente y queda retenido en el
contrato. Si llegas aquí, lo demás es cuesta abajo.

### 10. El técnico trabaja (teléfono B)

1. **Iniciar** → firma. Recibe el adelanto de materiales al instante.
2. **Terminar** → firma.

Entre los dos pasos, mira el saldo del técnico: debe haber subido solo el adelanto, no el total.
Eso es el escrow haciendo su trabajo y es lo mejor que tenéis para enseñar.

### 11. El cliente aprueba y califica (teléfono A)

1. **Aprobar** → firma. El resto del dinero llega al técnico.
2. **Calificar**: estrellas y, si quieres, un comentario.

---

## Comprobar que fue real

Al terminar:

- **Saldo del técnico** = total de la cotización − comisión.
- **Saldo del cliente** = lo que recargó − total − comisión.
- **Perfil del técnico**: ya no dice "Nuevo en Masi". Tiene un trabajo completado y su estrella.
- **En el explorador**, abriendo la dirección de cualquiera de los dos, se ven las operaciones.

Ese último punto es el argumento del proyecto: cualquiera puede comprobarlo sin fiarse de vosotros.

---

## Si algo falla

Anota **en qué paso exacto**, qué decía la pantalla y a qué hora. Con eso se puede mirar el log
del relayer y saber qué pasó. Un "no funcionó" sin el paso no se puede investigar.

Lo más probable, por orden:

| Síntoma | Causa más probable |
|---|---|
| La cuenta no entra | Se creó en otra URL (preview o localhost) |
| El técnico no ve la solicitud | Teléfonos en URLs distintas, o la solicitud no se publicó |
| Falla al pagar | Saldo insuficiente: falta la comisión del 5 % |
| Falla una firma | Se canceló la huella, o el relayer no respondió. Reintenta |
| Los dos tienen la misma dirección | Ambas cuentas se crearon en el mismo teléfono |

---

## Después de la prueba

- Las solicitudes de la prueba quedan en la base. **Vaciarla antes de grabar** (`FLUSHDB` desde
  la consola de Upstash), o usar solicitudes que sirvan también para el vídeo.
- Si la prueba sale bien, el checkpoint del 23 se cierra con **passkeys**, no con el fallback.
- Las cuentas creadas aquí son las definitivas. **No las borres**: el historial del técnico se
  siembra contra la suya.
