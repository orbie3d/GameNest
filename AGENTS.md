# GameNest Repository Instructions

## Scope and precedence

This file applies to the entire repository. If a nested directory later contains
its own `AGENTS.md`, follow the nearest file for work in that directory while
preserving all non-conflicting rules from this file.

## Product scope

GameNest is a web application for tracking, rating, reviewing, and discovering
video games. The MVP is limited to video games and includes authentication,
onboarding, a game catalog, a personal library, reviews, favorites, and
explainable rule-based recommendations.

Do not add social features, movies, series, machine learning, or speculative
abstractions unless they are part of an explicitly requested task. Design the
current code so those features can be added later without complicating the MVP.

The `UserGame` relationship is the core of the product. It owns a user's game
status, rating, liked state, favorite state, hours played, and relevant dates.
Reviews are independent: a user can rate a game without writing a review.

## Repository structure

- `apps/frontend`: React, TypeScript, Vite, and Tailwind CSS application.
- `apps/backend`: NestJS, TypeScript, TypeORM, and PostgreSQL API.
- `packages`: framework-neutral shared packages only.
- `docs/product`: functional scope and product decisions.
- `docs/architecture`: architecture decisions and technical diagrams.
- `docs/api`: API contracts and examples.
- `infra/docker`: application Dockerfiles and infrastructure support files.
- `tools/scripts`: repository automation scripts.

Keep frontend and backend code separate. Shared packages must not depend on
React, NestJS, TypeORM, browser APIs, or server-only APIs unless a package is
explicitly created for that environment.

## Tooling and commands

- Use `pnpm` exclusively. Do not create npm or Yarn lockfiles.
- Run commands from the repository root unless a command explicitly requires a
  workspace directory.
- Use workspace scripts from the root when available:
  - `pnpm dev`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm typecheck`
- Add dependencies to the workspace that uses them. Add a root dependency only
  when it configures or operates the whole monorepo.
- Keep `pnpm-lock.yaml` synchronized with dependency changes.

## General development rules

- Use TypeScript with strict type checking. Avoid `any`; when unavoidable,
  explain and contain it at the boundary.
- Prefer small, cohesive modules and explicit names over generic abstractions.
- Keep business rules out of controllers, UI components, and persistence
  entities.
- Do not duplicate domain constants across applications. Put stable,
  framework-neutral values such as `GameStatus` in a shared contracts package.
- Do not change public contracts silently. Update relevant documentation and
  tests with any intentional API change.
- Preserve unrelated user changes in the working tree.
- Do not commit generated build output, coverage output, logs, local editor
  configuration, or secrets.

## Backend conventions

- Expose the REST API under `/api/v1`.
- Organize NestJS by domain modules, including `auth`, `users`, `games`,
  `genres`, `platforms`, `user-games`, `reviews`, `onboarding`,
  `recommendations`, and `favorites` as those areas are implemented.
- Keep controllers thin. Controllers translate HTTP requests and responses;
  application services orchestrate use cases and domain rules.
- Validate every external input with DTOs and the global `ValidationPipe` using
  `whitelist`, `forbidNonWhitelisted`, and `transform`.
- Use TypeORM migrations for every database schema change. Never rely on
  `synchronize: true` outside disposable local experimentation, and keep it
  disabled in committed environment configuration.
- Enforce important invariants in both application logic and database
  constraints where practical.
- Use consistent error responses and do not expose stack traces, SQL errors,
  password hashes, token hashes, or internal implementation details.
- Hash passwords with Argon2id or an approved password hashing algorithm. Store
  only hashes of refresh tokens and support token revocation.
- Apply ownership checks before changing a user's library entries or reviews.
- Paginate collection endpoints and avoid N+1 database queries.
- Document endpoints, DTOs, authentication, examples, and common errors with
  Swagger/OpenAPI.

## Frontend conventions

- Organize product code by feature under `src/features`.
- Keep application setup, routing, and global providers under `src/app`.
- Put only genuinely reusable presentation components under `src/components`.
- Keep API access outside visual components and expose typed feature-level
  operations or hooks.
- Align client validation with API contracts, but never treat it as a
  replacement for backend validation.
- Cover loading, empty, success, validation, and error states.
- Build responsive and accessible interfaces. Preserve keyboard navigation,
  visible focus, semantic HTML, useful labels, and adequate contrast.
- Do not expose secrets or privileged credentials through Vite environment
  variables. Treat every client-side value as public.

## Data and business rules

- A user can have at most one `UserGame` entry per game.
- A user can have at most one review per game.
- A rating is either `null` or between `0.5` and `5.0` in increments of `0.5`.
- Hours played cannot be negative.
- A completion date cannot precede a start date.
- A game must be in the user's library before it can be marked as a favorite.
- A user's inactive account cannot create new sessions.
- Recommendations must be explainable and should exclude completed or dropped
  games unless an explicit rule justifies including them.
- Spoiler-marked review content must remain hidden until the reader chooses to
  reveal it.

## Configuration and security

- Keep real secrets out of the repository. Commit only documented placeholders
  in `.env.example` files.
- Validate required environment variables at application startup and fail with
  a clear message when configuration is incomplete.
- Use separate configuration and databases for development, testing, and
  production.
- Never log passwords, access tokens, refresh tokens, secret keys, or complete
  authentication headers.
- Use explicit CORS origins, secure HTTP headers, and rate limiting for
  authentication and public endpoints.

## Tests and completion criteria

- Add or update tests for every changed business rule and every important bug
  fix.
- Prefer unit tests for domain and service logic, integration tests for
  repositories and migrations, API tests for HTTP contracts and authorization,
  and end-to-end tests for critical user flows.
- Before considering a change complete, run the relevant lint, typecheck, test,
  and build commands. Report any command that could not be run and why.
- A database change is incomplete without a migration and a migration-level or
  integration-level verification.
- Update the relevant documentation when behavior, architecture, configuration,
  or API contracts change.

## Change discipline

- Keep changes focused on the requested task.
- Do not introduce dependencies without a concrete need.
- Do not perform destructive Git or database operations unless the user
  explicitly requests them.
- Do not commit or push unless the user explicitly asks for it.
