# Usuarios y sesiones de autenticación

La primera implementación del backend concentra el acceso en los módulos `auth`
y `users`. Los contratos HTTP se describen en la
[documentación de API](../api/authentication.md).

## Responsabilidades

- `auth`: registro, login, creación y rotación de sesiones, verificación de acceso
  y revocación. Los controladores delegan en `AuthService`.
- `users`: entidad de cuenta, representación pública y endpoint de cuenta actual.
- `app`: configuración de entorno y HTTP, validación, errores consistentes y Swagger.
- `database`: opciones de conexión compartidas por la aplicación y los comandos
  de migración; migraciones explícitas con sincronización deshabilitada.

## Persistencia

`users` conserva el UUID, correo único y normalizado, nombre visible, hash de
contraseña, indicador de cuenta activa y fechas UTC. `auth_sessions` conserva
un UUID de sesión, usuario propietario, hash único del refresh token,
vencimiento absoluto, revocación y fechas UTC. Cada login crea una sesión distinta.

Los IDs se generan mediante `randomUUID` en el servicio. La migración no requiere
habilitar extensiones PostgreSQL para generar UUID. La clave foránea y el índice
de usuario permiten consultar sesiones sin perder su asociación con la cuenta.
Las columnas de hashes se excluyen de las consultas ordinarias y las respuestas
públicas se construyen explícitamente.

El registro crea cuenta y sesión en una sola transacción. La unicidad del correo
se impone en PostgreSQL; el servicio traduce solo esa violación a un conflicto
HTTP. Las demás excepciones internas reciben una respuesta genérica.

## Contraseñas y tokens

Las contraseñas se procesan con Argon2id: 19456 KiB de memoria, dos iteraciones y
paralelismo uno, con sal generada por la biblioteca. El login de un correo
inexistente verifica un hash auxiliar para reducir diferencias de tiempo.

Los access tokens se firman con HS256 y un secreto validado del servidor. Su
verificación comprueba algoritmo, issuer, audience, expiración y formato de las
referencias a usuario y sesión. Después carga la sesión con su cuenta en una
consulta y comprueba revocación, vencimiento y estado activo.

Los refresh tokens son aleatorios y opacos. Solo se persiste SHA-256 de su valor;
no se usa este hash rápido para contraseñas. La renovación bloquea la fila de
sesión en una transacción, cambia su hash y conserva el vencimiento absoluto.
Esto impide que dos solicitudes consuman con éxito el mismo token. El logout
revoca la fila de la sesión, de modo que sus access tokens también dejan de servir.

## Entornos y compilación

Las pruebas con datos utilizan un PostgreSQL descartable separado de desarrollo.
La aplicación de producción recibe configuración mediante variables de entorno,
sin cargar `.env` de desarrollo. Los cambios de esquema se aplican mediante
comandos explícitos de migración.

Webpack mantiene las dependencias del workspace como externas. Esto permite
cargar los binarios nativos de Argon2 y los módulos Nest en tiempo de ejecución,
sin incluir binarios ni drivers opcionales en el bundle. Jest transforma los
paquetes Nest que distribuyen ESM mediante SWC para ejecutar las pruebas del
backend con la configuración existente.

El frontend de autenticación todavía no está implementado. No se incorporan
recuperación de contraseñas, verificación de correo, roles, proveedores externos
ni funciones sociales en esta primera entrega.
