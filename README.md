# GameNest

GameNest es una plataforma web para registrar, organizar, calificar y descubrir videojuegos. Cada persona podra mantener una biblioteca personal, escribir reviews y recibir recomendaciones explicables basadas en sus preferencias y actividad.

## Estado del proyecto

El repositorio se encuentra en su configuracion inicial. El monorepo, la configuracion de pnpm y las reglas de trabajo ya existen; las aplicaciones de frontend y backend aun no han sido generadas.

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
- Docker Desktop, cuando se configure PostgreSQL y los contenedores.

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

## Principios del dominio

`UserGame` es la relacion central entre una persona y un videojuego. Mantiene el estado, rating, favorito, horas jugadas y fechas. Las reviews se administran por separado, por lo que una persona puede calificar un videojuego sin escribir una opinion.

Las reglas y convenciones completas del repositorio se encuentran en [AGENTS.md](AGENTS.md).
