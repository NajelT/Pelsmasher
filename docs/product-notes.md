# Pelsmasher Product Notes

## Product Direction

Pelsmasher is a mobile-first strength training log.

The visual direction for the app is a dark alien/sci-fi cartoon style with:

- dark navy/black panels;
- acid green primary accents;
- thick comic outlines;
- hard shadows;
- blue-gray cartoon muscle illustrations with red target highlights.

The app should avoid generic fitness UI and should feel like a fast, punchy workout tool.

## Implemented Flow

### Screen 1: Muscle Group Choice

Users can:

- view the full muscle group grid;
- add a custom muscle group;
- delete a custom muscle group;
- hide a preset muscle group from the main grid;
- open a muscle card options menu;
- edit a muscle group's visible name and image;
- configure the custom muscle group name;
- optionally add a custom photo;
- tap a muscle group to open Screen 2.

Custom muscle groups and hidden preset muscle groups are stored locally in `localStorage`.

### Screen 2: Training Option Choice

Users can:

- go back to Screen 1;
- see training options for the selected muscle group;
- select a training option to open a `Selected option` pop-up;
- open a Create option dialog from a collapsed button;
- create a new training option by name;
- configure a training option by adding multiple exercises one by one;
- edit an existing training option;
- add or remove exercises from an existing training option;
- delete an unused training option;
- inspect the selected option's exercise list inside the pop-up;
- inspect history for each exercise inside the selected option pop-up;
- inspect history for the selected training option itself inside the pop-up;
- inspect training option history in two views:
  - compare view: set-by-set latest-session values against today's logged values/targets;
  - sessions view: completed workout days with exercise names and logged set results;
- download the full training option history as an Excel-compatible `.xls` file;
- press Start from the selected training option pop-up.

For now, training options and deleted/hidden option state are stored locally in `localStorage`.

Current Screen 2 terminology:

- Training option: a named choice for today's workout under a muscle group.
- Selected option pop-up: the temporary detail view opened after tapping a training option.
- Exercise: an item inside a training option.
- Exercise builder: the temporary list used while creating or editing a training option.
- Exercise history: strength history attached to an individual exercise.
- Training option history: session history attached to the selected option itself.

### Screen 3: Active Workout

Users can:

- press Start on a selected training option;
- see a dopamine countdown before the workout opens: `3`, `2`, `1`, `ДАВИ СОУС!`;
- see a live workout banner at the top of non-workout screens while the workout is active;
- tap the live workout banner to return to the active workout;
- see the last logged exercise and how long the active workout has been running;
- see the registered exercise list for the active training option;
- tap an exercise to open the result recording screen;
- record workout indicators for the exercise;
- see `kg` and `reps` values at the same time;
- choose weight and reps with two parallel vertical picker bars;
- hear a short mechanical click when a picker changes value;
- log multiple sets for the same exercise during the active workout;
- start a 1:30 rest timer automatically after pressing Log set;
- press Next exercise to mark the current exercise as finished and move forward;
- press Finish workout to complete the active workout;
- go back from the exercise recorder to the active workout exercise list;
- go back from the active workout to Screen 2.

Current Screen 3 terminology:

- Active workout: the live workout session opened from a training option.
- Live workout banner: a non-workout-screen notification showing active workout elapsed time, last logged exercise, and a shortcut back to the workout.
- Exercise recorder: the screen for logging indicators for one exercise.
- Vertical picker bar: the selected set-entry pattern; two side-by-side vertical controls for weight and reps.
- Logged set: a temporary set result recorded during the active workout.
- Rest timer: a 90-second countdown that starts after each logged set.
- Finished exercise: an exercise marked complete after pressing Next exercise.
- Completed workout payload: the structured workout result sent to the backend on Finish workout.
- Workout analytics: backend-calculated completion summary returned by `POST /api/workout-sessions`, including total volume, previous workout comparison, exercise-level deltas, and verdict.
- Workout baseline: previous session values used to prefill today's set recorder. The latest completed session for the selected training option is used automatically.

## Analytics Model

Analytics should be based on individual exercises, not only on training options.

This means a user can create a new training option without losing historical progress. If an exercise appears in multiple training options, its strength history should follow the exercise itself.

The data model separates:

- training option templates;
- exercises;
- performed sets;
- per-exercise history and analytics.
- completed workout sessions with start time, finish time, duration, workout set id, muscle group id, and logged sets grouped by exercise.

Training options are only collections for today's training flow. They are not the source of truth for progression.

Current backend-owned analytics:

- total workout volume: `sum(weight * reps)` across all logged sets;
- workout history responses include `totalVolume` on sessions and `volume` on logged sets;
- previous workout comparison for the same training option;
- exercise-level current volume, previous volume, delta, current best weight, and previous best weight;
- overall verdict based on volume delta.

## Backend Direction

The first Java backend lives in `backend/` and uses Spring Boot, Gradle, Spring Web, Spring Data JPA, and H2 for local development.

Current local API base URL:

- `http://127.0.0.1:8080/api`

Current backend resources:

- User: ownership boundary for all local catalog/history records. MVP uses a single `local-user`.
- Muscle group: the configurable card shown on Screen 1.
- Exercise: the long-lived analytics unit. Exercise history should survive when the same exercise appears in another training option.
- Training option: a named workout template under a muscle group, containing an ordered list of exercises.
- Workout session: one completed workout started from a training option; completion returns persisted session data plus backend-calculated analytics.
- Logged set: one performed set with weight, reps, timestamp, and exercise reference.

Backend normalization notes:

- Muscle groups, exercises, training options, workout sessions, and logged sets are scoped to a user.
- Training options keep a relation to their muscle group.
- Workout sessions keep relations to muscle group and training option.
- Logged sets keep a relation to exercise and workout session.
- Snapshot names are still stored on sessions/sets so old history remains readable after renaming a training option or exercise.
- Existing local H2 records without `user_id` are assigned to `local-user` at startup.

Current auth:

- Users register with email, password, and repeat password.
- Passwords are stored as BCrypt hashes, never as plain text.
- Login/register returns an opaque bearer token.
- Tokens are stored hashed in `auth_tokens`.
- The frontend saves the bearer token in `localStorage` and sends it on API requests.
- Requests without a token still fall back to `local-user` during MVP development, but normal UI starts at login/register.

Initial endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`
- `GET /api/muscle-groups`
- `POST /api/muscle-groups`
- `PATCH /api/muscle-groups/{id}`
- `DELETE /api/muscle-groups/{id}`
- `GET /api/muscle-groups/{id}/training-options`
- `POST /api/training-options`
- `PATCH /api/training-options/{id}`
- `DELETE /api/training-options/{id}`
- `POST /api/workout-sessions` returns `{ session, analytics }`
- `GET /api/training-options/{id}/history`
- `GET /api/exercises/{id}/history`

The frontend still uses `localStorage` for the auth token, active workout draft state, and a legacy offline fallback. Core persisted catalog/history/session analytics now come from the backend.
