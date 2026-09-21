# Interfaz compartida de Masi

`escrow.ts` fija los datos de P1 que consumen P3 y P4. El código Rust del contrato
es la autoridad del ABI. Al desplegar, generar los bindings desde su WASM y adaptar
la ejecución de transacciones a estos tipos; este archivo no simula firmas ni envíos.

## Calificaciones

`rating_of(provider)` devuelve exactamente:

```json
{
  "stars_sum": 144,
  "rating_count": 30,
  "completed_jobs": 34,
  "disputes": 1
}
```

Los cuatro campos son `u32` en Rust y `number` en TypeScript/JSON. El promedio se
calcula como `stars_sum / rating_count`; cuando no hay reseñas se muestra
"Sin reseñas". No almacenar un promedio, estrellas decorativas o texto de UI en
este objeto. Nombre, oficio, distrito, precio y foto son datos del perfil fuera
de la cadena y se guardan por separado.

`RatingSource.rating_of(provider)` es la frontera para sustituir el JSON por una
lectura de contrato: el adaptador RPC debe devolver el resultado decodificado,
no el envoltorio de simulación o `AssembledTransaction`. Al conectar los perfiles,
reemplazar sus direcciones de prueba por las cuentas reales de los proveedores.

## Trabajos y argumentos

- `u64` e `i128` se representan con `bigint`; no convertir montos o IDs a `number`.
- `Option<u64>` se representa con `bigint | undefined` en los bindings nativos.
- `JobState` usa `{ tag: 'Requested', values: undefined }` y las otras ocho variantes.
- `comment_hash` representa exactamente 32 bytes, `stars` está entre 1 y 5.
- Los tipos de retorno describen el valor exitoso una vez tratados los errores.
- `dispute`, `resolve` y `rate` están implementadas. `dispute` pasa el trabajo a
  `Disputed` desde `Started` o `Submitted`; `resolve` lo lleva a `Resolved` y cuenta
  como trabajo completado, así que calificarlo después mantiene
  `rating_count <= completed_jobs`.

`auto_release`, `cancel` y `dispute` incluyen `caller` para autenticar a quien
actúa. `cancel` y `dispute` comprueban además que sea cliente o proveedor.
`auto_release` acepta cualquier dirección autorizada una vez cumplido el plazo.
Esta precisión del ABI conserva los roles de la tabla del scope y permite
`require_auth` también en las acciones con más de un rol posible.

El plazo se mide desde `submitted_at`. La liberación necesita que alguien invoque
`auto_release`; el contrato no se ejecuta por sí mismo al pasar el tiempo.
