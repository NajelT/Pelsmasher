# Pelsmasher

There comes a moment in every workout when the noise drops out.

The playlist is still running. The timer is still ticking. The room is still the room. But somewhere between the last rep and the next plate, the whole thing gets real simple:

show up, log the work, smash the set, come back stronger.

That is Pelsmasher.

Pelsmasher is a mobile-first strength training log with a dark sci-fi comic soul. It is built for lifters who want a fast workout flow, clear history, and just enough ritual to make the next set feel like it matters.

No sterile spreadsheet energy. No sleepy fitness wallpaper. This thing tracks the work with acid-green intent, hard shadows, muscle-card targets, workout history, rest timers, and analytics that tell you whether today moved the story forward.

## What It Does

- Pick a muscle group from a punchy visual grid.
- Create and edit training options for the day.
- Build each option from reusable exercises.
- Start a live workout with a countdown.
- Log sets with weight and reps.
- Auto-start a 90-second rest timer after each set.
- Finish the workout and get backend-calculated analytics.
- Compare today's effort against previous sessions.
- Keep exercise history alive even when exercises appear in different training options.

## The Feel

Pelsmasher is designed to feel like the training notebook of a space-gym outlaw:

- dark navy and black panels;
- acid green primary accents;
- thick comic outlines;
- hard shadows;
- blue-gray muscle illustrations with red target highlights;
- fast taps, loud states, and no generic gym-app gloss.

It is not trying to politely ask whether you maybe want to exercise today.

It is here to look you in the eye and say: the set is waiting.

## Tech Stack

Frontend:

- React 19
- Vite 6
- TypeScript
- Vitest
- Testing Library
- Lucide React

Backend:

- Java
- Spring Boot
- Gradle
- Spring Web
- Spring Data JPA
- PostgreSQL
- BCrypt password hashing
- Bearer-token auth

## Project Structure

```text
Pelsmasher/
  backend/                 Spring Boot API
  docs/                    Product notes and direction
  public/assets/muscles/   Muscle-group artwork
  src/                     React frontend
```

## Run It

Install frontend dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Start the backend:

```bash
cd backend
docker compose up -d
./gradlew bootRun
```

Frontend defaults to:

```text
http://localhost:5173
```

Backend API defaults to:

```text
http://127.0.0.1:8080/api
```

## Test It

Frontend typecheck:

```bash
npm run typecheck
```

Frontend tests:

```bash
npm test
```

Frontend production build:

```bash
npm run build
```

Backend tests:

```bash
cd backend
./gradlew test
```

## API Highlights

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/health
GET  /api/muscle-groups
POST /api/muscle-groups
GET  /api/muscle-groups/{id}/training-options
POST /api/training-options
POST /api/workout-sessions
GET  /api/training-options/{id}/history
GET  /api/exercises/{id}/history
```

Completed workouts return persisted session data plus analytics, including total volume, previous-workout comparison, exercise-level deltas, and an overall verdict.

## Local Data

The backend uses PostgreSQL. For local development, start the bundled database:

```bash
cd backend
docker compose up -d
```

Default local connection values:

```text
JDBC URL: jdbc:postgresql://127.0.0.1:5432/pelsmasher
User Name: pelsmasher
Password: pelsmasher
```

The Docker volume is ignored by git. The app can also fall back to local frontend data during MVP development, so the prototype stays usable while the backend evolves.

## Philosophy

Progress is not magic.

It is a record.

One session becomes history. History becomes a baseline. The baseline becomes the thing you chase. Pelsmasher keeps that loop tight, visible, and a little bit cinematic.

Lift the weight.

Log the truth.

Come back tomorrow with better evidence.
