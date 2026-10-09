# Documentación de la aplicación GameNest

Última revisión: 8 de octubre de 2026.

Este documento describe el producto, su alcance y las reglas vigentes. El
[roadmap y las tareas principales](roadmap.md) registran el trabajo necesario
para implementar el MVP. Las instrucciones de desarrollo están en
[AGENTS.md](../../AGENTS.md).

## Propósito y público

GameNest es una aplicación web para registrar, organizar, calificar, reseñar y
descubrir videojuegos. Está dirigida a personas que quieren mantener su historial
de juegos, ordenar sus pendientes y decidir qué jugar después a partir de sus
preferencias y experiencias.

El ciclo principal es: declarar preferencias, construir una biblioteca, registrar
la experiencia y recibir recomendaciones explicables. El objetivo del MVP es
permitir completar ese recorrido con datos persistentes y una cuenta personal.

## Alcance del MVP

| Área | Comportamiento esperado |
| --- | --- |
| Autenticación | Registro, inicio y cierre de sesión, renovación y revocación de sesiones. |
| Usuario | Identidad e información personal mínima necesaria para la cuenta y sus preferencias. |
| Onboarding | Registrar preferencias de géneros, plataformas y juegos conocidos. |
| Catálogo | Consultar videojuegos, buscar, filtrar y navegar resultados paginados; ver el detalle de un juego. |
| Biblioteca | Agregar y gestionar juegos con estado, puntuación, indicador de gusto, horas y fechas. |
| Favoritos | Marcar y consultar favoritos que ya pertenecen a la biblioteca. |
| Reseñas | Crear, editar y eliminar una opinión por usuario y juego; ocultar contenido con spoilers hasta su revelación voluntaria. |
| Recomendaciones | Sugerir juegos mediante reglas y mostrar las razones de cada sugerencia. |

Las funciones sociales, amigos, feeds, películas, series y machine learning
quedan fuera del MVP. Su inclusión requiere una solicitud explícita; no forman
parte del trabajo pendiente de este roadmap.

## Recorrido principal

1. La persona crea una cuenta o inicia sesión.
2. Completa el onboarding con sus preferencias y juegos conocidos.
3. Explora el catálogo y agrega juegos a su biblioteca.
4. Actualiza el estado, la puntuación, las horas y las fechas de sus juegos.
5. Marca favoritos y, si lo desea, escribe reseñas.
6. Consulta recomendaciones y sus razones para elegir el siguiente juego.
7. Regresa a actualizar su biblioteca y aporta nuevas señales para las sugerencias.

Cada pantalla debe contemplar carga, ausencia de datos, éxito, errores y
validación. La interfaz debe funcionar en móvil y escritorio y permitir
navegación con teclado, foco visible y lectura mediante tecnologías de asistencia.

## Núcleo del dominio

`UserGame` es la relación central entre el usuario y un videojuego. Es responsable
del estado, la puntuación (`rating`), el indicador de gusto (`liked`), el favorito
(`favorite`), las horas jugadas y las fechas relevantes. Favoritos utiliza esa
misma relación; no debe crear una segunda fuente de verdad para esos datos.

Las reseñas son independientes de la puntuación: calificar un juego no exige
escribir una reseña. El gusto y el favorito son atributos distintos; no se debe
asumir que modificar uno modifica automáticamente el otro.

El modelo conceptual incluye usuarios, juegos, géneros, plataformas, entradas de
biblioteca, reseñas, preferencias y sesiones. Usuarios y sesiones ya tienen
entidades y migración; el resto sigue pendiente.

### Reglas obligatorias

- Un usuario puede tener como máximo una entrada `UserGame` por videojuego.
- Un usuario puede tener como máximo una reseña por videojuego.
- La puntuación es `null` o está entre `0.5` y `5.0`, en incrementos de `0.5`.
- Las horas jugadas no pueden ser negativas.
- La fecha de finalización no puede preceder a la fecha de inicio.
- Un juego debe estar en la biblioteca antes de marcarlo como favorito.
- Una cuenta inactiva no puede crear nuevas sesiones.
- Antes de cambiar entradas de biblioteca o reseñas, se comprueba su propiedad.
- Las recomendaciones deben explicar sus razones y excluir juegos completados o
  abandonados, salvo que una regla explícita justifique su inclusión.
- El contenido de reseñas marcado como spoiler permanece oculto hasta que el
  lector elige revelarlo.

Las reglas se implementarán en servicios o módulos de dominio y, donde sea
práctico, también mediante restricciones de base de datos. Cada regla requiere
pruebas de sus casos válidos, inválidos y de autorización aplicables.

## Arquitectura y organización

| Ubicación | Responsabilidad |
| --- | --- |
| `apps/frontend` | React, TypeScript, Vite, React Router y Tailwind CSS. Producto en `src/features`, configuración y rutas en `src/app`, presentación reutilizable en `src/components` cuando corresponda. |
| `apps/backend` | API NestJS y TypeScript, persistencia con TypeORM y PostgreSQL. Módulos por dominio, controladores delgados y servicios para casos de uso. |
| `packages` | Contratos y constantes compartidas neutrales, como `GameStatus`; sin dependencias de React, NestJS, TypeORM ni APIs del navegador o servidor. |
| `docs/product` | Alcance, decisiones de producto y roadmap. |
| `docs/architecture` | Decisiones técnicas y diagramas que se documenten durante la implementación. |
| `docs/api` | Contratos, ejemplos, autenticación y errores de la API. |
| `infra/docker` | Dockerfiles y soporte de contenedores de las aplicaciones cuando se implementen. |
| `tools/scripts` | Automatización del repositorio cuando sea necesaria. |

El monorepo utiliza pnpm workspaces y Nx. PostgreSQL y pgAdmin están definidos en
el `docker-compose.yml` de la raíz. Los requisitos, la configuración local y los
comandos de ejecución se encuentran en el [README principal](../../README.md).

### Contrato técnico previsto

- API REST bajo `/api/v1`, con Swagger/OpenAPI para endpoints, DTOs, ejemplos y errores.
- Validación de entradas mediante DTOs y un `ValidationPipe` global con
  `whitelist`, `forbidNonWhitelisted` y `transform`.
- Migraciones TypeORM para cada cambio de esquema; `synchronize: false`.
- Colecciones paginadas y consultas que eviten el problema N+1.
- Contraseñas con Argon2id o un algoritmo aprobado; solo hashes de refresh tokens,
  con revocación de sesiones.
- Configuración validada al arrancar y entornos separados de desarrollo, prueba y producción.
- CORS con orígenes explícitos, encabezados seguros y límites de solicitudes.
- Errores consistentes sin detalles internos; secretos y tokens excluidos de los logs.
- Acceso a la API fuera de los componentes visuales y operaciones tipadas por feature.

Estas condiciones describen lo que debe implementar el MVP; el estado siguiente
indica cuáles ya están presentes.

## Estado verificado del repositorio

| Elemento | Estado al 8 de octubre de 2026 |
| --- | --- |
| Monorepo y calidad | Nx, pnpm, TypeScript estricto, ESLint y scripts raíz de desarrollo, lint, typecheck, test y build configurados. |
| Frontend | Aplicación base generada, rutas de ejemplo y Tailwind configurado; sin pantallas de producto implementadas. |
| Backend | Registro, login, refresh y logout en `auth`; cuenta actual en `users/me`. Se conserva `GET /api/v1` con `{ "message": "Hello API" }`. |
| Persistencia | Entidades de usuarios y sesiones y migración inicial aplicada en desarrollo. TypeORM con `synchronize: false`; las migraciones se ejecutan explícitamente. |
| Infraestructura local | PostgreSQL y pgAdmin activos en Docker Compose. Conexión del backend y arranque local verificados; frontend responde en el puerto 5173. |
| Pruebas | Pruebas de configuración y contratos HTTP, DTOs, Swagger, CORS y rate limiting. Diez pruebas reales de autenticación y migraciones en un PostgreSQL descartable separado. |
| Funciones del MVP | API de autenticación y cuenta implementada. Frontend de autenticación, onboarding, catálogo, biblioteca, favoritos, reseñas y recomendaciones pendientes. |
| Seguridad y API | `/api/v1`, Swagger, validación global, errores consistentes, CORS explícito, Helmet y rate limiting. Argon2id para contraseñas; refresh tokens almacenados como hashes, rotativos y revocables. |

La configuración valida variables requeridas, puertos, duraciones de tokens,
secreto JWT y orígenes CORS al arrancar. Prueba y producción no cargan el archivo
de desarrollo. Swagger está disponible en `/api/v1/docs`, con la especificación
en `/api/v1/openapi.json`. Los contratos, políticas y comandos se detallan en la
[API de autenticación](../api/authentication.md) y sus decisiones en la
[arquitectura de autenticación](../architecture/authentication.md).

## Decisiones pendientes

| Decisión | Cuándo resolverla |
| --- | --- |
| Fuente del catálogo, campos mínimos, imágenes y condiciones de uso | Antes de cargar el catálogo; no hay un proveedor externo seleccionado. |
| Valores definitivos de `GameStatus` y transiciones permitidas | Antes de publicar los contratos y la biblioteca. |
| Campos editables de la cuenta y almacenamiento de tokens en el frontend | Antes de implementar edición de cuenta y frontend de autenticación. La API actual usa email y nombre visible, access tokens Bearer en JSON y sesiones con refresh rotativo de vencimiento absoluto. |
| Obligatoriedad y posibilidad de actualizar o retomar el onboarding | Antes de implementar ese recorrido. |
| Convención de fechas y precisión de las horas jugadas | Antes del esquema de `UserGame` y sus DTOs. |
| Requisito de biblioteca para reseñar, visibilidad y límites de las reseñas | Antes de implementar reseñas; su independencia de la puntuación ya está definida. |
| Efecto de eliminar una entrada de biblioteca sobre sus favoritos y reseñas | Antes de implementar eliminación; debe conservarse la regla de favoritos. |
| Reglas, pesos, desempates y comportamiento sin preferencias o historial | Antes de implementar recomendaciones. |
| Entorno de publicación y operación del MVP | Antes de preparar la entrega. |

El orden del roadmap es una propuesta de ejecución. Estas decisiones no deben
tratarse como contratos ya aprobados o funciones ya implementadas.

## Fuentes y mantenimiento

- [AGENTS.md](../../AGENTS.md): reglas vigentes de producto y desarrollo.
- [README principal](../../README.md) y código del repositorio: configuración y estado actual.
- [Documento inicial de septiembre de 2026](../../output/pdf/GameVault_Documentacion_Inicial_v1.0_TypeORM.pdf): antecedente de la visión del producto bajo el nombre GameVault. El nombre vigente es GameNest; ante diferencias, se siguen las instrucciones actuales del repositorio.

Actualizar este documento cuando cambien el alcance o las decisiones. Registrar
el avance en el roadmap solo cuando se cumplan los criterios de aceptación y
exista evidencia de implementación y verificación.
