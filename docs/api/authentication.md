# API de autenticación y Swagger

Base local: `http://localhost:3000/api/v1`.

- Swagger UI: [http://localhost:3000/api/v1/docs](http://localhost:3000/api/v1/docs).
- OpenAPI JSON: [http://localhost:3000/api/v1/openapi.json](http://localhost:3000/api/v1/openapi.json).
- Los ejemplos usan el puerto por defecto. Si `PORT` cambia, ajustar estas URLs.

## Preparación y ejecución

Desde la raíz del repositorio, con Node.js 22.12 o superior:

1. Instalar dependencias con `pnpm install`. Si una instalación previa usa el
   store local del proyecto, utilizar `pnpm --store-dir .pnpm-store install`.
2. Crear `apps/backend/.env` a partir de `apps/backend/.env.example` y configurar
   las credenciales de PostgreSQL.
3. Ejecutar `pnpm auth:configure-local` para generar un secreto JWT privado en
   `.env`. El comando conserva un secreto existente y nunca imprime su valor.
4. Levantar la base con `docker compose up -d database`.
5. Aplicar el esquema con `pnpm migration:run`.
6. Iniciar las aplicaciones con `pnpm dev` o solo la API con
   `pnpm exec nx serve backend`.
7. Abrir Swagger y utilizar **Try it out** en los endpoints de autenticación.

Las migraciones no se ejecutan automáticamente al arrancar. `synchronize` está
deshabilitado. `pnpm migration:run` aplica solo migraciones pendientes y puede
repetirse sin recrear tablas ni datos.

## Endpoints implementados

| Método | Ruta | Autorización | Éxito |
| --- | --- | --- | --- |
| GET | `/api/v1` | Pública | `200`, mantiene `{ "message": "Hello API" }`. |
| POST | `/api/v1/auth/register` | Pública | `201`, crea cuenta y sesión. |
| POST | `/api/v1/auth/login` | Pública | `200`, inicia una sesión. |
| POST | `/api/v1/auth/refresh` | Refresh token en el body | `200`, rota el token y renueva el acceso. |
| POST | `/api/v1/auth/logout` | Bearer access token | `204`, revoca la sesión actual. |
| GET | `/api/v1/users/me` | Bearer access token | `200`, devuelve la cuenta actual. |

### Registro

```json
{
  "email": "player@example.com",
  "password": "A-long-example-password",
  "displayName": "Player One"
}
```

- `email`: correo válido, máximo 254 caracteres; se recorta y convierte a minúsculas.
- `password`: entre 12 y 128 caracteres; se conserva exactamente, incluidos espacios.
- `displayName`: entre 2 y 80 caracteres después de recortar espacios exteriores.
- No se aceptan propiedades adicionales; no es posible enviar `isActive`, IDs o hashes.
- El correo normalizado es único, también ante registros concurrentes.
- La cuenta se crea activa; todavía no hay endpoint para editarla o desactivarla.

### Inicio de sesión

```json
{
  "email": "player@example.com",
  "password": "A-long-example-password"
}
```

Utiliza las mismas reglas de correo y contraseña. Un correo inexistente, una
contraseña incorrecta y una cuenta inactiva devuelven el mismo error `401`.

### Respuesta de registro, login y refresh

```json
{
  "user": {
    "id": "f693c3b1-337d-4d07-9476-2b64f974bcbe",
    "email": "player@example.com",
    "displayName": "Player One",
    "createdAt": "2026-10-08T23:00:00.000Z"
  },
  "accessToken": "<JWT privado>",
  "refreshToken": "<token opaco privado>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshExpiresAt": "2026-11-07T23:00:00.000Z"
}
```

Los valores entre `<...>` son marcadores, no tokens utilizables. Las respuestas de
autenticación y cuenta utilizan `Cache-Control: no-store`. Nunca contienen hashes
de contraseñas o refresh tokens.

El access token es un JWT HS256 con `sub` (usuario), `sid` (sesión), `jti`,
expiración, issuer `gamenest-api` y audience `gamenest-client`. Dura 15 minutos por
defecto. Cada petición protegida comprueba además que la sesión siga activa y
que la cuenta no esté inactiva; el logout invalida el acceso inmediatamente.

El refresh token contiene 64 bytes aleatorios codificados como base64url
(86 caracteres). La base almacena únicamente su hash SHA-256. La sesión vence
30 días después de crearse por defecto; renovar no extiende esa fecha absoluta.

### Renovación

```json
{
  "refreshToken": "<último refresh token recibido>"
}
```

Enviar el token real obtenido en el paso anterior. Cada renovación lo reemplaza:
conservar el nuevo y descartar el anterior. Reutilizar un token consumido devuelve
`401`. Ante dos renovaciones concurrentes del mismo token, una tiene éxito y la
otra devuelve `401`; el cliente debe coordinar las renovaciones.

La rotación conserva la sesión; los access tokens emitidos previamente siguen
vigentes hasta su propia expiración o la revocación de la sesión. No se implementa
todavía seguimiento histórico de tokens consumidos ni revocación de toda la
familia por detectar su reutilización.

### Cuenta actual y cierre de sesión

En Swagger, pulsar **Authorize** e introducir únicamente el valor de
`accessToken`. Swagger agrega el prefijo Bearer. Después, probar `GET /users/me`
o `POST /auth/logout`.

En otros clientes, enviar:

```http
Authorization: Bearer <accessToken>
```

`GET /users/me` devuelve exclusivamente `id`, `email`, `displayName` y `createdAt`
de la cuenta asociada a ese token. `POST /auth/logout` no necesita body y responde
sin contenido. Revoca solo esa sesión; las sesiones de otros dispositivos o
usuarios no se modifican.

El transporte inicial utiliza tokens en JSON y encabezado Authorization; no hay
cookies de sesión. Swagger no conserva la autorización al recargar la página.
Al implementar el frontend, definir su almacenamiento y renovación respetando
este contrato; el secreto JWT permanece exclusivamente en el servidor.

## Errores y límites

Todos los errores HTTP utilizan este formato:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": ["email must be an email"]
}
```

`message` es una cadena o un arreglo de cadenas de validación.

| Estado | Causas habituales |
| --- | --- |
| 400 | Campos inválidos, body mal formado o propiedades no permitidas. |
| 401 | Credenciales inválidas, cuenta inactiva, token vencido, modificado, consumido, revocado o sesión inexistente. |
| 409 | Correo ya registrado. |
| 429 | Límite de solicitudes excedido. |
| 500 | Error interno, sin detalles de SQL ni stack traces en la respuesta. |

Límite inicial por IP y endpoint: 10 solicitudes por minuto en autenticación,
100 por minuto en los demás endpoints. El contador está en memoria por proceso;
la configuración de proxies y de un contador compartido se resolverá si el
entorno de despliegue lo requiere. CORS acepta únicamente los orígenes de
`CORS_ORIGIN`, separados por comas y sin rutas ni comodines. Helmet aplica
encabezados de seguridad; Swagger utiliza scripts del mismo origen y conserva
la restricción `script-src 'self'`.

## Configuración

| Variable | Regla |
| --- | --- |
| `NODE_ENV` | `development`, `test` o `production`; por defecto `development`. |
| `PORT` | Entero entre 1 y 65535; por defecto 3000. |
| `CORS_ORIGIN` | Uno o más orígenes HTTP/HTTPS explícitos. |
| `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Cadenas no vacías obligatorias. |
| `POSTGRES_PORT` | Entero obligatorio entre 1 y 65535. |
| `JWT_ACCESS_SECRET` | Secreto aleatorio privado de al menos 32 caracteres; se rechaza el placeholder de ejemplo. |
| `JWT_ACCESS_TTL_SECONDS` | Entero entre 60 y 3600; por defecto 900. |
| `REFRESH_TOKEN_TTL_SECONDS` | Entero entre 3600 y 7776000; por defecto 2592000. |

Desarrollo carga `apps/backend/.env` desde la raíz o `.env` desde el workspace del
backend. Prueba y producción no cargan el archivo de desarrollo: reciben sus
propias variables de entorno y deben usar bases de datos separadas. Swagger está
habilitado en esta etapa; su exposición en producción se definirá con el entorno
de publicación.

## Migraciones y pruebas

- `pnpm migration:create src/database/migrations/Nombre`: crea una migración
  vacía dentro del backend; completar `up` y `down` con el cambio de esquema.
- `pnpm migration:run`: aplica las migraciones pendientes.
- `pnpm migration:revert`: revierte la última migración. La migración inicial
  elimina cuentas y sesiones al revertirse; utilizarla únicamente sobre una base
  descartable o dentro de un procedimiento de recuperación acordado.
- `pnpm test`: pruebas unitarias, contratos HTTP, DTOs, Swagger, CORS, errores y
  rate limiting; no requiere una base de datos.
- `pnpm test:backend:integration`: requiere Docker; crea un contenedor PostgreSQL
  con credenciales efímeras, puerto local libre y base `gamenest_test`, ejecuta las
  pruebas reales y elimina únicamente ese contenedor al finalizar.

Las pruebas de integración verifican aplicación repetible y reversión de la
migración, hashes, registro concurrente, login, cuentas inactivas, expiración,
rotación concurrente, aislamiento de cuentas y revocación. En `pnpm test`, esa
suite queda omitida deliberadamente y se ejecuta mediante el comando separado.

Referencias técnicas: [OpenAPI en NestJS](https://docs.nestjs.com/openapi/introduction),
[validación](https://docs.nestjs.com/techniques/validation) y
[rate limiting](https://docs.nestjs.com/security/rate-limiting).
