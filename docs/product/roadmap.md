# Roadmap y tareas principales de GameNest

Última revisión: 8 de octubre de 2026.

El alcance y las reglas se describen en la
[documentación de la aplicación](application.md). Este roadmap propone el orden
de implementación del MVP según las dependencias actuales; no fija fechas de
entrega ni incorpora funciones fuera del alcance.

## Cómo utilizarlo

- `[x]` significa implementado o documentado, según la tarea, y verificado.
- `[ ]` significa pendiente; no equivale a trabajo en curso.
- Cada tarea tiene un identificador `CT-xxx` para referenciarla en cambios y documentación.
- Resolver y documentar las decisiones de una fase antes de convertirlas en contratos.
- Marcar una tarea como terminada solo tras cumplir su aceptación y los criterios generales de cierre.

## Fase 0: base del proyecto y documentación

Estado: completada; arranque de frontend y backend y conexión a PostgreSQL verificados.

- [x] **CT-001: configurar el monorepo y las aplicaciones base.** Nx, pnpm,
  React/Vite, NestJS, Tailwind y TypeScript estricto están presentes. Existen
  scripts raíz de desarrollo, lint, typecheck, test y build.
- [x] **CT-002: configurar la persistencia y los servicios locales.** Docker
  Compose define PostgreSQL y pgAdmin; el backend configura TypeORM con
  variables de entorno y `synchronize: false`. Esta tarea cubre la configuración,
  no la verificación de una base de datos en ejecución.
- [x] **CT-003: documentar el producto y su plan de trabajo.** Alcance, reglas,
  estado real, decisiones pendientes y tareas disponibles desde los README.
- [x] **CT-004: verificar y estabilizar la base técnica.** Ejecutar los cuatro
  chequeos raíz, registrar sus resultados y corregir cualquier fallo detectado antes de
  construir funciones sobre la base. Verificar también el arranque local y la
  conexión a PostgreSQL usando la configuración documentada.

Aceptación de la fase: entorno reproducible, aplicaciones que arrancan, conexión
local comprobada, chequeos aprobados y documentación enlazada.

### Verificación realizada el 8 de octubre de 2026

| Comprobación | Resultado |
| --- | --- |
| `pnpm lint` | Aprobado. |
| `pnpm typecheck` | Aprobado para frontend y backend. |
| `pnpm test` | Aprobado para frontend y backend; incluye configuración y contratos HTTP de autenticación y Swagger. |
| `pnpm build` | Aprobado para frontend y backend. |
| Enlaces locales de documentación e identificadores de tareas | Verificados, sin enlaces rotos ni identificadores duplicados. |
| `pnpm test:backend:integration` | Diez pruebas de autenticación y migraciones aprobadas en PostgreSQL separado y descartable. |
| Arranque de aplicaciones y conexión real a PostgreSQL | Verificados. Frontend en 5173, API y Swagger en 3000; migración aplicada en desarrollo. |

Los chequeos aprobados validan la base y la API de autenticación; las funciones
del MVP todavía pendientes se mantienen sin marcar como completadas.

## Fase 1: contratos, configuración y migraciones

Depende de la fase 0. Estado: parcialmente completada; CT-005 sigue pendiente.

- [ ] **CT-005: definir los contratos mínimos del dominio.** Crear el paquete
  compartido neutral con `GameStatus` y los contratos necesarios. Definir estados,
  paginación, representación de errores y convenciones de fechas sin duplicarlos
  en frontend y backend.
- [x] **CT-006: completar la configuración y protección HTTP.** Validar variables
  requeridas, tipos y rangos; separar entornos; aplicar CORS explícito, encabezados
  seguros, rate limiting y `ValidationPipe` global. Evitar datos sensibles en
  respuestas y logs.
- [x] **CT-007: preparar el ciclo de migraciones.** Configurar las opciones de conexión y los
  comandos pnpm para crear y ejecutar migraciones. Verificar su aplicación en una
  base de prueba vacía y documentar el procedimiento de reversión.
- [x] **CT-008: establecer la documentación de API.** Configurar Swagger/OpenAPI
  y documentar convenciones, ejemplos y errores en `docs/api`; completar cada
  endpoint a medida que se implemente.

Aceptación de la fase: entradas inválidas rechazadas de forma consistente,
configuración incompleta detectada al arrancar, contratos reutilizables,
migraciones verificadas y documentación de API accesible.

## Fase 2: usuarios y autenticación

Estado: API implementada; frontend pendiente. La base necesaria de la fase 1 ya
está presente; los contratos compartidos del resto del dominio siguen en CT-005.

- [x] **CT-009: implementar usuarios y persistencia de cuentas.** Definir los
  campos mínimos, restricciones de identidad, estado activo y migraciones;
  devolver únicamente información permitida de la cuenta.
- [x] **CT-010: implementar sesiones seguras.** Registro, login, renovación y
  logout; hashing de contraseñas, almacenamiento de hashes de refresh tokens,
  revocación y rechazo de sesiones nuevas para cuentas inactivas. Definir el
  transporte de tokens y la política de expiración.
- [ ] **CT-011: conectar la experiencia de autenticación.** Pantallas de registro
  e inicio de sesión, estado de sesión y navegación protegida con validación y
  estados de carga y error.

Aceptación de la fase: el usuario puede registrarse, iniciar sesión, renovar y
cerrarla; las sesiones revocadas no se renuevan y las rutas protegidas rechazan
accesos sin autorización. Hay pruebas de los casos válidos e inválidos y de
cuentas inactivas, sin exposición de hashes ni tokens en logs.

## Fase 3: catálogo y onboarding

El catálogo depende de la fase 1; la persistencia de preferencias y el onboarding
dependen también de la fase 2. Se propone completar esta fase después de autenticación.

- [ ] **CT-012: definir y cargar el catálogo inicial.** Elegir su fuente y campos
  mínimos; modelar juegos, géneros y plataformas mediante migraciones. Preparar
  una carga reproducible de datos de desarrollo y prueba sin credenciales reales.
- [ ] **CT-013: implementar consulta del catálogo.** Endpoints y pantallas de
  listado y detalle, búsqueda, filtros y paginación con consultas sin N+1.
- [ ] **CT-014: implementar preferencias y onboarding.** Persistir géneros,
  plataformas y juegos conocidos del usuario. Definir finalización, reanudación
  y actualización del cuestionario y construir el recorrido en frontend.

Aceptación de la fase: catálogo navegable con resultados paginados y estados
vacíos y de error; preferencias guardadas y recuperables entre sesiones. Los
contratos y migraciones tienen verificación y el recorrido no permite modificar
preferencias ajenas.

## Fase 4: biblioteca y favoritos

Depende de las fases 2 y 3. Es el núcleo funcional del MVP.

- [ ] **CT-015: implementar `UserGame`.** Crear la relación usuario-juego con
  unicidad y campos de estado, puntuación, gusto, favorito, horas y fechas;
  incorporar migraciones y restricciones prácticas de base de datos.
- [ ] **CT-016: implementar gestión de biblioteca.** Agregar, consultar, editar y
  eliminar entradas propias; validar puntuaciones, horas, fechas y estados.
  Definir el efecto de eliminar una entrada sobre los datos relacionados.
- [ ] **CT-017: construir las pantallas de biblioteca.** Listado paginado,
  filtros y edición de los datos de cada juego mediante operaciones de API
  tipadas fuera de los componentes visuales.
- [ ] **CT-018: implementar favoritos.** Marcar, desmarcar y listar favoritos
  utilizando `UserGame`; rechazar favoritos de juegos fuera de la biblioteca.

Aceptación de la fase: una sola entrada por usuario y juego incluso ante
solicitudes concurrentes; puntuación opcional de `0.5` a `5.0` en pasos de `0.5`,
horas no negativas y fechas consistentes. Ningún usuario puede cambiar entradas
ajenas; los favoritos siempre pertenecen a la biblioteca. Hay pruebas de reglas,
autorización y restricciones de persistencia.

## Fase 5: reseñas independientes

Depende de las fases 2 y 3; coordinar con la fase 4 las reglas de pertenencia y eliminación.

- [ ] **CT-019: implementar el dominio y la API de reseñas.** Definir visibilidad,
  límites del contenido y relación con la biblioteca; crear migraciones con
  unicidad usuario-juego. Permitir crear, editar y eliminar una reseña propia,
  sin exigir una puntuación.
- [ ] **CT-020: construir la experiencia de reseñas y spoilers.** Formularios y
  vistas con validación y estados de error; ocultar el contenido con spoilers
  hasta una acción explícita y accesible de revelación.

Aceptación de la fase: una reseña como máximo por usuario y juego, controles de
propiedad, puntuaciones sin reseña y reseñas sin puntuación. El contenido con
spoilers no aparece antes de la revelación; los casos se verifican mediante
pruebas de API y de interfaz.

## Fase 6: recomendaciones explicables

Depende de las fases 3 y 4. Las reseñas no son un requisito para calcular sugerencias.

- [ ] **CT-021: definir y probar las reglas de recomendación.** Especificar
  señales de preferencias, géneros, plataformas, historial, puntuaciones y gusto;
  decidir pesos, desempates y comportamiento sin datos suficientes. Excluir
  completados y abandonados salvo una excepción explícita documentada.
- [ ] **CT-022: implementar el servicio, la API y la pantalla.** Retornar y mostrar
  las razones de cada juego recomendado; cubrir carga, resultados vacíos y
  errores y utilizar consultas eficientes.

Aceptación de la fase: cada sugerencia tiene razones verificables coherentes con
sus reglas; los juegos excluidos no aparecen sin una excepción justificada. Hay
pruebas deterministas para los escenarios con y sin historial o preferencias.

## Fase 7: validación y entrega del MVP

Depende de las fases funcionales anteriores.

- [ ] **CT-023: verificar el recorrido completo.** Pruebas end-to-end de registro,
  onboarding, catálogo, biblioteca, puntuación, favoritos, reseñas y recomendaciones;
  verificar aislamiento de usuarios y persistencia entre sesiones.
- [ ] **CT-024: revisar usabilidad, accesibilidad y rendimiento.** Comprobar móvil
  y escritorio, teclado, foco, etiquetas, contraste y todos los estados de pantalla;
  revisar paginación, consultas y tiempos de las operaciones principales.
- [ ] **CT-025: preparar operación y publicación.** Definir el entorno de destino,
  configuración de producción, Dockerfiles necesarios, ejecución de migraciones,
  respaldo y recuperación; documentar el procedimiento sin publicar secretos.
- [ ] **CT-026: cerrar la documentación y validar la entrega.** Actualizar producto,
  arquitectura y API; ejecutar los chequeos raíz y verificar migraciones en una
  base de prueba. Registrar resultados y limitaciones conocidas.

Aceptación de la fase: una persona puede completar el recorrido del MVP, las
reglas y el aislamiento están verificados y la aplicación tiene un procedimiento
reproducible de instalación y operación. Publicar o desplegar requiere una
solicitud específica del usuario.

## Criterios generales de cierre

- Alcance y aceptación de la tarea cumplidos, con evidencia del comportamiento.
- Pruebas de cada regla de negocio modificada y de errores importantes corregidos.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` aprobados; documentar
  cualquier comando no ejecutado, su causa y los fallos que impidan cerrar la tarea.
- Todo cambio de esquema incluye migración y verificación de migración o integración.
- Contratos, configuración, ejemplos y documentación actualizados cuando cambien.
- Sin secretos, logs, artefactos de build o cobertura incorporados al repositorio.

## Próxima tarea

La API inicial puede probarse desde Swagger: registro, login, refresh, logout y
cuenta actual. Continuar con **CT-011** para construir el frontend de autenticación,
o con **CT-005** y **CT-012** para preparar el dominio y el catálogo del backend.
Estos pasos son trabajo pendiente; esta entrega no incluye pantallas de autenticación.
