# Pelsmasher Backend

Spring Boot backend for the Pelsmasher app.

## Run

```bash
cd /Users/iljalushpajev/Documents/Pelsmasher/backend
./gradlew bootRun
```

API base URL:

```text
http://127.0.0.1:8080/api
```

## Test

```bash
cd /Users/iljalushpajev/Documents/Pelsmasher/backend
./gradlew test
```

Quick health check:

```bash
curl http://127.0.0.1:8080/api/health
```

Get muscle groups:

```bash
curl http://127.0.0.1:8080/api/muscle-groups
```

Get training options for Chest:

```bash
curl http://127.0.0.1:8080/api/muscle-groups/chest/training-options
```

## Database

Local development uses H2 file database:

```text
/Users/iljalushpajev/Documents/Pelsmasher/backend/data/pelsmasher.mv.db
```

Open the browser:

```text
http://127.0.0.1:8080/h2-console
```

Use these connection values:

```text
JDBC URL: jdbc:h2:file:./data/pelsmasher;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH
User Name: sa
Password:
```

Useful tables:

- `users`
- `auth_tokens`
- `muscle_groups`
- `exercises`
- `training_options`
- `training_option_exercises`
- `workout_sessions`
- `logged_sets`

Current MVP runs as a single local user:

```text
users.id = local-user
```

The backend backfills older local records with `local-user` on startup.

Auth endpoints:

```bash
curl -X POST http://127.0.0.1:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"secret123","repeatPassword":"secret123"}'
```

```bash
curl -X POST http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"secret123"}'
```

Both return a bearer token. The frontend stores it in `localStorage` and sends it as:

```text
Authorization: Bearer <token>
```

## Frontend Integration

The frontend defaults to:

```text
VITE_API_BASE_URL=http://127.0.0.1:8080/api
```

If the backend is offline, the UI falls back to local data so the prototype remains usable.

## IntelliJ IDEA

Use the project run configurations from the top toolbar:

- `Pelsmasher Backend`
- `Pelsmasher Frontend`

Do not run `Current File`. Backend should run through `./gradlew bootRun`, because the bundled Gradle in IDEA can conflict with Java 26.

If IDEA asks for Gradle settings, choose:

- Gradle distribution: `Wrapper`
- Gradle JVM: the installed project/default JDK is fine when using the wrapper

Fallback if IDEA run configurations misbehave:

- double-click `/Users/iljalushpajev/Documents/Pelsmasher/run-backend.command`
- double-click `/Users/iljalushpajev/Documents/Pelsmasher/run-frontend.command`
