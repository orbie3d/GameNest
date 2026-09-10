# GameNest

GameNest es una plataforma web para registrar, organizar, calificar y descubrir videojuegos. Cada persona podra mantener una biblioteca personal, escribir reviews y recibir recomendaciones explicables basadas en sus preferencias y actividad.

## Estado del proyecto

El monorepo, Nx, las aplicaciones de frontend y backend, Tailwind CSS y ESLint ya estan configurados. PostgreSQL local se ejecuta mediante Docker Compose y el backend ya tiene configurada la conexion con TypeORM; las migraciones se incorporaran en la siguiente fase.

## Alcance del MVP

- Registro, inicio de sesion, cierre de sesion y renovacion de tokens.
- Onboarding de preferencias: generos, plataformas y juegos conocidos.
- Catalogo de videojuegos con busqueda, filtros y paginacion.
- Biblioteca personal con estados, puntuacion, favoritos, horas y fechas.
- Una review por usuario y videojuego, independiente de la puntuacion.
- Recomendaciones basadas en reglas y razones comprensibles.

Las funciones sociales, peliculas, series y machine learning se consideran evoluciones futuras y no forman parte del MVP.

## Stack planificado

- Frontend: React, TypeScript, Vite y Tailwind CSS.
- Backend: NestJS, TypeScript, TypeORM y Swagger/OpenAPI.
- Base de datos: PostgreSQL.
- Entorno local: Docker y Docker Compose.
- Monorepo: pnpm workspaces.

## Estructura

```text
GameNest/
├─ apps/
│  ├─ frontend/          # Aplicacion React
│  └─ backend/           # API NestJS
├─ packages/             # Paquetes compartidos neutrales
├─ docs/
│  ├─ product/           # Alcance y decisiones de producto
│  ├─ architecture/      # Arquitectura y decisiones tecnicas
│  └─ api/               # Contratos y documentacion de API
├─ infra/docker/         # Configuracion de contenedores
├─ tools/scripts/        # Automatizaciones del repositorio
├─ AGENTS.md             # Reglas de trabajo del proyecto
├─ package.json
└─ pnpm-workspace.yaml
```

## Requisitos

- Node.js 22 o superior.
- pnpm 11 o superior.
- Git.
- Docker Desktop.

## Comandos

Instalar dependencias del monorepo:

```bash
pnpm install
```

Cuando frontend y backend esten creados, los comandos principales seran:

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

## Base de datos local

El entorno local usa PostgreSQL 17 mediante Docker Compose. Crea
`apps/backend/.env` a partir de `apps/backend/.env.example` y define una
contrasena local antes de levantar la base de datos:

```bash
docker compose up -d database
```

Para comprobar su estado:

```bash
docker compose ps
```

pgAdmin queda disponible en `http://localhost:5050`. Inicia sesion con las
variables `PGADMIN_DEFAULT_EMAIL` y `PGADMIN_DEFAULT_PASSWORD` de
`apps/backend/.env`. Para registrar la base de datos, usa `database` como host,
el puerto `5432`, y las credenciales `POSTGRES_USER` y `POSTGRES_PASSWORD`.

## Principios del dominio

`UserGame` es la relacion central entre una persona y un videojuego. Mantiene el estado, rating, favorito, horas jugadas y fechas. Las reviews se administran por separado, por lo que una persona puede calificar un videojuego sin escribir una opinion.

Las reglas y convenciones completas del repositorio se encuentran en [AGENTS.md](AGENTS.md).
