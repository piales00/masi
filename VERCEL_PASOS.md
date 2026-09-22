# Publicar Masi en Vercel

## Pruebas personales autorizadas

Se habilitó también **https://masiapp-nine.vercel.app** para pruebas desde la
cuenta personal. El dominio original del equipo sigue permitido; no se migran
passkeys entre dominios. En el dominio de pruebas hay que registrar cuentas nuevas.

Desde la raíz del repositorio, vincular el proyecto personal existente `masiapp`
del espacio `jossepv117-5688` y publicar con `npx vercel deploy --prod`.
No crear otro proyecto. Configurar primero las variables de `frontend/.env.example`
en Production, incluyendo las credenciales reales del relayer y Upstash.
La ruta `/api/salud` no confirma que esas credenciales estén listas.

Las instrucciones siguientes sobre el dominio original corresponden al proyecto
del equipo, no al despliegue personal de pruebas.

El dominio de las passkeys sigue siendo **https://masiapp.vercel.app**. Pertenece
al equipo: publicar en otro proyecto no concede acceso a ese dominio.
No registrar cuentas en URLs de preview ni cambiar el dominio para sortear permisos.

## Preparación

Desde PowerShell, en la carpeta raíz del repositorio:

```powershell
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
```

No continuar si falla una comprobación. El aviso de tamaño de los archivos de
JavaScript no es un error de compilación.

## Acceso y configuración

1. El propietario del proyecto debe dar acceso a tu cuenta de Vercel; si no puede,
   puede desplegar él mismo la rama corregida.
2. Ejecutar `npx vercel login` y `npx vercel link` **desde la raíz del repositorio**.
   Elegir el equipo y el proyecto que ya administran `masiapp.vercel.app`.
   No crear otro proyecto pensando que tendrá automáticamente ese dominio.
3. Configurar Vite, Root Directory `frontend`, Node 24.x, Install Command `npm ci`,
   Build Command `npm run build` y Output Directory `dist`.
4. Activar la inclusión de archivos fuera de Root Directory: la carpeta `shared`
   contiene tipos y constantes que necesitan tanto el frontend como la API.
5. En Settings → Environment Variables, cargar las variables de
   `frontend/.env.example` para Production. Los valores vacíos requieren
   credenciales reales de OpenZeppelin Relayer y Upstash Redis.
   Nunca poner secretos en variables `VITE_`, en commits ni en conversaciones.
6. Confirmar que el proyecto seleccionado es el del equipo antes de publicar:

```powershell
npx vercel project inspect
npx vercel deploy --dry --json
npx vercel deploy --prod
```

`.vercelignore` limita la subida a `frontend` y `shared`, excluyendo dependencias,
archivos de entorno y los documentos ajenos al proyecto de esta carpeta.
La carpeta `.vercel` y `.env.local` son locales y no se suben a GitHub.

## Comprobar el resultado

- Abrir `https://masiapp.vercel.app` y recargar una ruta como `/acceso`.
- `/api/salud` debe responder `{"ok":true}`. Esto solo comprueba que arranca la
  API; no verifica las credenciales de Redis ni del relayer.
- Probar registro y cierre/inicio de sesión con una passkey real en un celular,
  tanto para cliente como para profesional. Las pruebas automatizadas simulan
  el autenticador y no reemplazan esta comprobación.
- Si queda una confirmación pendiente, usar “Terminar verificación” para
  reintentar el mismo registro, sin crear otra cuenta.

La huella, el rostro o el PIN del celular desbloquean la passkey. No sustituyen
las credenciales del servidor: el relayer registra la cuenta en Stellar y Redis
sirve al backend. Masi nunca recibe el PIN ni los datos biométricos.

## GitHub es independiente

Los conflictos de la mezcla se resolvieron en `codex/backend-vercel`, conservando
los cambios de `develop`. No subir directamente a `main`.

```powershell
git status
git push origin codex/backend-vercel
```

El pull request debe tener **base `develop`**. Un despliegue manual en Vercel no
sube commits a GitHub. Conectar el repositorio es opcional y sirve para automatizar
despliegues futuros; no lo conectes a una rama equivocada.

## Límites actuales

Con `VITE_STORE=api` configurada antes de compilar, solicitudes, cotizaciones,
reseñas y estados de pedidos simulados se comparten mediante la API y Redis.
Sin esa variable se conserva el modo local en un navegador. Los pedidos locales
anteriores no se migran automáticamente; crear una solicitud nueva para probar dos celulares.
Los pagos siguen siendo simulados y no mueven dinero. La huella vuelve a comprobar
la identidad antes de cada acción manual, pero no firma una transacción de pago.
Perfiles, fotos, motivos de disputa e historial de accesos siguen siendo locales.
Ver `REVISION_P2_ENTREGA.md` para la matriz de requisitos y límites pendientes.
