import { describe, expect, test } from "vitest";
import type { ApiLoggedSet, ApiWorkoutSession } from "./api";
import {
  buildCompletedWorkoutPayloadFromSession,
  buildWorkoutAnalytics,
  type WorkoutSet
} from "./App";

function loggedSet(overrides: Partial<ApiLoggedSet>): ApiLoggedSet {
  return {
    exerciseId: "bench-press",
    exerciseName: "Bench Press",
    id: `set-${Math.random()}`,
    performedAt: "2026-08-01T10:00:00.000Z",
    reps: 8,
    setNumber: 1,
    volume: 640,
    weight: 80,
    ...overrides
  };
}

function session(overrides: Partial<ApiWorkoutSession>): ApiWorkoutSession {
  return {
    completedAt: "2026-08-01T10:30:00.000Z",
    durationSeconds: 1800,
    id: "session-1",
    muscleGroupId: "chest",
    sets: [loggedSet({})],
    startedAt: "2026-08-01T10:00:00.000Z",
    totalSets: 1,
    totalVolume: 640,
    workoutSetId: "heavy-press",
    workoutSetName: "Heavy Press",
    ...overrides
  };
}

const workoutSet: WorkoutSet = {
  id: "heavy-press",
  muscleGroupId: "chest",
  name: "Heavy Press",
  exercises: [{ id: "bench-press", name: "Bench Press", history: [] }],
  history: []
};

describe("buildCompletedWorkoutPayloadFromSession", () => {
  test("groups a flat session's sets by exercise", () => {
    const pastSession = session({
      sets: [
        loggedSet({ id: "s1", setNumber: 1, weight: 80, reps: 8 }),
        loggedSet({ id: "s2", setNumber: 2, weight: 82.5, reps: 8 })
      ]
    });

    const payload = buildCompletedWorkoutPayloadFromSession(pastSession);

    expect(payload.exerciseResults).toHaveLength(1);
    expect(payload.exerciseResults[0].sets.map((set) => set.weight)).toEqual([
      80, 82.5
    ]);
    expect(payload.workoutSetName).toBe("Heavy Press");
  });
});

describe("buildWorkoutAnalytics for a past session", () => {
  test("compares a past session against the one before it in history", () => {
    const olderSession = session({
      id: "session-older",
      sets: [loggedSet({ id: "old-1", weight: 70, reps: 8 })]
    });
    const viewedSession = session({
      id: "session-viewed",
      sets: [loggedSet({ id: "new-1", weight: 80, reps: 8 })]
    });

    const analytics = buildWorkoutAnalytics(
      buildCompletedWorkoutPayloadFromSession(viewedSession),
      workoutSet,
      olderSession
    );

    expect(analytics.currentVolume).toBe(640);
    expect(analytics.previousVolume).toBe(560);
    expect(analytics.diff).toBe(80);
    expect(analytics.verdict).toContain("improved");
  });

  test("treats the oldest session as the baseline with no previous session", () => {
    const onlySession = session({ id: "session-only" });

    const analytics = buildWorkoutAnalytics(
      buildCompletedWorkoutPayloadFromSession(onlySession),
      workoutSet,
      undefined
    );

    expect(analytics.previousVolume).toBe(0);
    expect(analytics.verdict).toContain("baseline");
  });
});
