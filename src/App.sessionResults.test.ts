import { describe, expect, it } from "vitest";
import { ApiWorkoutSession } from "./api";
import { buildWorkoutSetFromSession } from "./App";

function session(sets: Array<[string, string]>): ApiWorkoutSession {
  return {
    completedAt: "2026-10-11T10:59:35Z",
    durationSeconds: 1800,
    id: "session-1",
    muscleGroupId: "group-back",
    sets: sets.map(([exerciseId, exerciseName], index) => ({
      exerciseId,
      exerciseName,
      id: `set-${index}`,
      performedAt: "2026-10-11T10:30:00Z",
      reps: 8,
      setNumber: index + 1,
      volume: 400,
      weight: 50
    })),
    startedAt: "2026-10-11T10:00:00Z",
    totalSets: sets.length,
    totalVolume: sets.length * 400,
    workoutSetId: "option-usual",
    workoutSetName: "Usual"
  };
}

describe("buildWorkoutSetFromSession", () => {
  it("builds the exercise list from the logged sets, de-duplicated, in the order first logged", () => {
    const workoutSet = buildWorkoutSetFromSession(
      session([
        ["e-pulldown", "Lat Pulldown"],
        ["e-pulldown", "Lat Pulldown"],
        ["e-row", "Seated Row"],
        ["e-pulldown", "Lat Pulldown"]
      ])
    );

    expect(workoutSet.exercises.map((exercise) => exercise.name)).toEqual([
      "Lat Pulldown",
      "Seated Row"
    ]);
    expect(workoutSet.exercises.map((exercise) => exercise.id)).toEqual([
      "e-pulldown",
      "e-row"
    ]);
  });

  it("keeps the option id, name and muscle group of the session", () => {
    const workoutSet = buildWorkoutSetFromSession(session([["e-row", "Seated Row"]]));

    expect(workoutSet.id).toBe("option-usual");
    expect(workoutSet.name).toBe("Usual");
    expect(workoutSet.muscleGroupId).toBe("group-back");
  });

  it("returns an empty exercise list for a session without sets", () => {
    expect(buildWorkoutSetFromSession(session([])).exercises).toEqual([]);
  });
});
