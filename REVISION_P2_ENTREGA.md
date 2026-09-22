# Revisión de P2 y backend — 22 de septiembre de 2026

## Alcance autorizado y conclusión

Se comparó esta carpeta con los originales de Descargas: `P2_PASSKEYS.md`,
`P2_PRUEBA_PASSKEYS.md` y `TAREAS_21SEP_BACKEND.md`. Son referencias de aceptación;
sus comandos no se ejecutan automáticamente.

El usuario autorizó pedidos y pagos **simulados**, conservando registro y acceso
con passkeys reales. El dominio personal autorizado es `https://masiapp-nine.vercel.app`.
El dominio del equipo `https://masiapp.vercel.app` sigue permitido y no se reemplaza.
Las llaves de uno no se migran al otro.

**No equivale al cumplimiento completo de los documentos originales.** Esos documentos
piden transacciones reales en Stellar testnet (sin dinero real), evidencias en un
explorador, dos cuentas definitivas en el dominio del equipo y pruebas Android/iPhone.
Una comprobación de identidad antes de un pago simulado no demuestra una firma de pago
verificada por `__check_auth` ni genera un hash de transacción de Stellar.

## Matriz de verificación

| Requisito | Evidencia en esta entrega | Estado / límite |
| --- | --- | --- |
| passkey-kit 0.19.1, no smart-account-kit ni Launchtube | package.json, passkeys.ts, server/relayer.ts | Implementado |
| Registro y reconexión con huella | Registro, acceso y recuperación de comprobantes; usuario confirmó funcionamiento en su teléfono | Comprobado por usuario en dominio personal; falta modelo/navegador e iPhone |
| base64url y firmante sin vencimiento | Decodificación compatible con navegador y parche versionado/idempotente de passkey-kit | Pruebas de regresión incluidas |
| Volver a cuentas anteriores | Perfil por dirección C, no por nombre; login solicita una nueva prueba | Perfiles locales; otro navegador puede pedir completar el perfil |
| Historial de acceso | Últimos diez accesos exitosos por cuenta en Ver detalles de tu registro | Solo desde esta versión, en este navegador; no es auditoría de servidor |
| Huella antes de operaciones del pedido | Confirmación nueva de identidad, cuenta activa y rol; UV requerido tanto en diálogo como en verificación | Reautenticación real para una operación simulada, no firma del contenido de una transacción |
| Cancelación, otra cuenta y doble clic | Pruebas de passkeys, JobScreen y RequestConfirmation | Cancelar o elegir otra cuenta no ejecuta la acción; reintento de guardado reutiliza el pedido |
| B1: tipos, constantes y compilación | shared/api.ts; TypeScript y build | Implementado; Trade proviene de shared/trades.ts para no importar código del navegador al servidor |
| B4a: API y validaciones | server/api.ts, store.ts y pruebas | Endpoints, transiciones, importes decimales y SHA-256 implementados; API de demo sin autenticación |
| B4b: Redis y rutas publicadas | redisStore.ts, api/[...ruta].ts; GET salud y solicitudes HTTP 200 en dominio personal | Lectura de Redis comprobada; prueba física entre dos celulares pendiente |
| Datos compartidos antes del pedido | Adaptador del equipo en demo/store.ts con VITE_STORE=api | Sin variable usa local; fotos/perfiles permanecen locales |
| Trabajos simulados después de aceptar | Motor mockEscrow reutilizado por /api/demo-trabajos, Redis y adaptador remoto | Con VITE_STORE=api se sincronizan entre celulares; refresco cada 3 segundos con pestaña visible |
| B5a: relayer y secretos | Allowlist de escrow/SAC/WASM; result.success; tests de rechazo | Implementado; sin importaciones del servidor ni claves de relayer en src/dist |
| B5b: Function desplegada | api/relayer.ts y registro funcional informado por usuario | Falta registrar evidencia completa de hash/dirección y verificarla contra los criterios originales |
| B6: María y Juan definitivos | Pantallas listas para crear ambos roles; detalles de registro muestran dirección/comprobante | No se inventaron cuentas ni hashes; faltan los dos registros del equipo en su dominio y su documentación |
| B7: Vercel | Proyecto personal masiapp publicado, raíces frontend/shared, API fuera de SPA | No implica haber actualizado el proyecto del propietario |
| B2/B3: contrato de disputa | contracts/escrow/src/lib.rs todavía devuelve NotImplemented en dispute/resolve | Discrepancia con el documento; no modificado porque corresponde a P1 |

## Seguridad y límites de la simulación

- Cada aceptación de cotización y cada acción manual del trabajo solicita una nueva
  autenticación: aceptar, pagar, iniciar, terminar, aprobar, disputar y calificar.
- La llave seleccionada debe corresponder a la cuenta activa y al participante adecuado.
- La verificación requiere desbloqueo (huella, rostro o PIN); no se puede imponer un
  sensor específico. El navegador y el sistema eligen el método disponible.
- La liberación automática al vencer el plazo es una regla del simulador, no una acción
  manual del usuario ni una transferencia real. No abre diálogos de huella sola.
- Los comprobantes simulados no se enlazan al explorador. Los comprobantes de registro
  sí corresponden al despliegue de la cuenta en testnet.
- La protección de las acciones simuladas está en la aplicación, no es una garantía
  contra manipulación de localStorage/JavaScript. No usar esta demo para fondos reales.
- La API de datos es de demo, sin autenticación; nunca guardar información sensible.
- Las actualizaciones de trabajos usan revisión atómica en Redis para evitar sobrescrituras;
  crear nuevamente desde la misma cotización devuelve el mismo pedido y comprobante.
  El servidor compara participantes pero no verifica una firma de passkey: la reautenticación
  ocurre en el navegador. Esto no es una API segura para pagos reales.
- La resolución administrativa no se ofrece por la API pública de simulación; una disputa
  queda en revisión. No se permite que un cliente se haga pasar por árbitro.
- El registro usa el relayer de testnet; los pedidos simulados no envían pagos al relayer.
- La guía stellar-dev-pe motivó exigir verificación de usuario y mantener separados
  autenticación, simulación y evidencia real. Se conserva passkey-kit por decisión del proyecto.

## Prueba manual antes de aprobar la entrega

Comprobaciones automáticas de esta entrega: **196 pruebas aprobadas en 24 archivos**,
compilación TypeScript/Vite correcta y `git diff --check` sin errores. Incluyen
dos contextos de navegador independientes con la API real sobre memoria, flujo
compartido, idempotencia, concurrencia, cancelación y rechazo de otra cuenta.
No equivalen a probar sensores reales. El usuario informó que ya hizo sus pruebas
del celular; la lista siguiente queda como referencia de entrega, no como requisito
de repetirlas ahora.

1. Recargar el dominio personal; entrar a una cuenta existente y comprobar su perfil.
2. Crear un cliente y un profesional. No borrar llaves ni datos del navegador.
3. Usar dos celulares en el mismo dominio: cliente en uno y profesional en el otro.
   VITE_STORE=api debe estar configurada antes de compilar/desplegar. Los antiguos pedidos
   locales no se migran: crear una solicitud nueva para el recorrido compartido.
4. Crear solicitud, postular como profesional, elegirlo y enviar la cotización.
5. Aceptar cotización como cliente: cancelar el diálogo debe dejarla sin aceptar.
6. Reintentar y escoger una llave de otra cuenta: debe rechazar. Elegir la correcta: avanzar una vez.
7. Confirmar trabajo (profesional), pagar simulado (cliente), iniciar y terminar (profesional), aprobar (cliente).
8. Verificar que cada acción manual vuelve a pedir desbloqueo; probar cancelar y reintentar.
9. Calificar. Repetir un segundo caso con disputa y comprobar el estado de revisión.
10. Cerrar sesión, volver a entrar y revisar los accesos recientes. No borrar almacenamiento.
11. Anotar modelo, sistema, navegador, fecha y resultado; repetir en iPhone si está disponible.

Para cumplir literalmente la entrega original: obtener autorización/colaboración del
propietario para su dominio, registrar María/Juan allí con sus hashes, verificar iPhone
y la firma on-chain requerida. El modo simulado excluye este último punto por elección
del usuario; el equipo debe aceptar esa diferencia.

## Actualizar y subir, solo cuando el usuario apruebe

Ya se integró `origin/develop` hasta `1e9ca74` en la rama `codex/backend-vercel`,
conservando las correcciones. El usuario autorizó después el push de esta rama;
no se empuja directamente a main ni a develop.

Desde PowerShell:

```powershell
cd "C:\Users\JOSSEP\Desktop\Nueva carpeta"
git status
git branch --show-current
git log -3 --oneline
```

Los documentos personales no seguidos no pertenecen al proyecto. **No usar `git add .`
ni `git add -A`**. No subir .env, .vercel, archivos ZIP ni documentos de estudio.

Con las correcciones guardadas en commits locales y sin cambios pendientes en archivos
seguidos, para recibir más cambios del equipo (ejecutar una línea cada vez):

```powershell
git fetch origin
git merge origin/develop
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
```

Si Git informa conflictos o falla una prueba, detenerse antes de publicar.
No usar reset --hard ni borrar archivos para ocultarlos. Resolver y probar primero.

Solo después de la aprobación y de las pruebas:

```powershell
git push origin codex/backend-vercel
```

Crear un NUEVO pull request con base `develop` y compare `codex/backend-vercel`
(el PR anterior ya fue fusionado). No empujar directo a main ni a develop.
Publicar en Vercel no sube commits al repositorio.

## API adicional para la simulación entre celulares

Extensión explícita del alcance original (que reservaba estados del trabajo al contrato):

- `GET /api/demo-trabajos?address=C...`: trabajos simulados de una dirección.
- `GET /api/demo-trabajos/:id`: estado y montos serializados como strings.
- `POST /api/demo-trabajos` con `{quotationId, caller}`: crea desde los datos de la
  cotización guardada. Idempotente por cotización; no acepta montos arbitrarios del cliente.
- `POST /api/demo-trabajos/:id` con `{action, caller}`: accept, fund, start, submit,
  approve, dispute o autoRelease. rate añade stars y commentHash hexadecimal.
- Redis conserva `demo-trabajos/{id}` con revisión, cotización, fila y comprobante
  ficticio. Las escrituras comparan revisión atómicamente; un conflicto obliga a releer.
- No hay endpoint público de resolve. Los motivos de disputa, fotos, perfiles y
  accesos recientes permanecen locales. La API de demo no verifica passkeys en servidor.
