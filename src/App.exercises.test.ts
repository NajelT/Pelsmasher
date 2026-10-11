import { describe, expect, it } from "vitest";
import { suggestExercises } from "./App";

const known = [
  { id: "1", name: "Bench Press" },
  { id: "2", name: "Incline Press" },
  { id: "3", name: "Пэкдэк" },
  { id: "4", name: "Lat Pulldown" }
];

describe("suggestExercises", () => {
  it("returns every known exercise when nothing is typed", () => {
    expect(suggestExercises(known, [], "")).toHaveLength(4);
  });

  it("filters by the typed text, ignoring case and surrounding spaces", () => {
    expect(suggestExercises(known, [], "  PRESS ").map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("matches non-latin names", () => {
    expect(suggestExercises(known, [], "пэк").map((e) => e.id)).toEqual(["3"]);
  });

  it("skips exercises already in the draft, ignoring case", () => {
    expect(
      suggestExercises(known, ["bench press"], "press").map((e) => e.id)
    ).toEqual(["2"]);
  });

  it("returns nothing when no exercise matches", () => {
    expect(suggestExercises(known, [], "deadlift")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(suggestExercises(known, [], "", 2)).toHaveLength(2);
  });
});
