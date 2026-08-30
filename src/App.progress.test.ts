import { describe, expect, it } from "vitest";
import { ApiWorkoutSessionSummary } from "./api";
import {
  buildCalendarMonthGrid,
  buildTrendBuckets,
  buildWeekComparison,
  groupSessionsByDay,
  localDateKey
} from "./App";

function session(
  completedAt: string,
  totalVolume: number,
  id = completedAt
): ApiWorkoutSessionSummary {
  return {
    completedAt,
    id,
    totalSets: 1,
    totalVolume,
    workoutSetName: "Test option"
  };
}

describe("groupSessionsByDay", () => {
  it("sums volume and counts sessions on the same local day", () => {
    const totals = groupSessionsByDay([
      session("2026-08-10T08:00:00.000Z", 100),
      session("2026-08-10T18:00:00.000Z", 50, "second"),
      session("2026-08-11T08:00:00.000Z", 200, "third")
    ]);

    expect(totals.get(localDateKey("2026-08-10T08:00:00.000Z"))).toEqual({
      count: 2,
      volume: 150
    });
    expect(totals.get(localDateKey("2026-08-11T08:00:00.000Z"))).toEqual({
      count: 1,
      volume: 200
    });
  });

  it("returns an empty map for no sessions", () => {
    expect(groupSessionsByDay([]).size).toBe(0);
  });
});

describe("buildCalendarMonthGrid", () => {
  it("builds full weeks covering the whole month, marking days outside it", () => {
    const monthCursor = new Date(2026, 7, 15); // August 2026
    const totals = groupSessionsByDay([session("2026-08-05T08:00:00.000Z", 300)]);

    const weeks = buildCalendarMonthGrid(monthCursor, totals, new Date(2026, 7, 5));

    const allDays = weeks.flatMap((week) => week.days);
    expect(allDays.length % 7).toBe(0);

    const augustFirst = allDays.find(
      (day) => day.inMonth && day.date.getDate() === 1
    );
    expect(augustFirst).toBeDefined();

    const dayWithVolume = allDays.find((day) => day.dateKey === "2026-08-05");
    expect(dayWithVolume?.volume).toBe(300);
    expect(dayWithVolume?.count).toBe(1);
    expect(dayWithVolume?.isToday).toBe(true);

    const outsideDays = allDays.filter((day) => !day.inMonth);
    expect(outsideDays.length).toBeGreaterThan(0);
  });

  it("gives each week row a total across its 7 days", () => {
    const monthCursor = new Date(2026, 7, 1);
    const totals = groupSessionsByDay([
      session("2026-08-03T08:00:00.000Z", 100),
      session("2026-08-04T08:00:00.000Z", 50, "b")
    ]);

    const weeks = buildCalendarMonthGrid(monthCursor, totals);
    const weekWithData = weeks.find((week) => week.totalVolume > 0);

    expect(weekWithData?.totalVolume).toBe(150);
    expect(weekWithData?.totalCount).toBe(2);
  });
});

describe("buildWeekComparison", () => {
  it("compares this week's totals against last week's", () => {
    // Wednesday, so the current week starts on Monday 2026-08-24
    const today = new Date(2026, 7, 26);
    const totals = groupSessionsByDay([
      session("2026-08-25T08:00:00.000Z", 400), // this week
      session("2026-08-18T08:00:00.000Z", 250, "prev") // previous week
    ]);

    const comparison = buildWeekComparison(totals, today);

    expect(comparison.currentVolume).toBe(400);
    expect(comparison.currentCount).toBe(1);
    expect(comparison.previousVolume).toBe(250);
    expect(comparison.diffVolume).toBe(150);
    expect(comparison.verdict).toContain("up");
  });

  it("reports no comparison when last week has no data", () => {
    const today = new Date(2026, 7, 26);
    const totals = groupSessionsByDay([session("2026-08-25T08:00:00.000Z", 400)]);

    const comparison = buildWeekComparison(totals, today);

    expect(comparison.previousVolume).toBe(0);
    expect(comparison.verdict).toContain("No workouts logged last week");
  });
});

describe("buildTrendBuckets", () => {
  it("builds 5 weekly buckets in month mode", () => {
    const today = new Date(2026, 7, 26);
    const totals = groupSessionsByDay([session("2026-08-25T08:00:00.000Z", 400)]);

    const buckets = buildTrendBuckets(totals, "month", today);

    expect(buckets).toHaveLength(5);
    expect(buckets[buckets.length - 1]?.volume).toBe(400);
    expect(buckets[buckets.length - 1]?.label).toBe("This wk");
  });

  it("builds 3 monthly buckets in quarter mode", () => {
    const today = new Date(2026, 7, 26);
    const totals = groupSessionsByDay([
      session("2026-06-10T08:00:00.000Z", 100),
      session("2026-07-10T08:00:00.000Z", 200, "b"),
      session("2026-08-10T08:00:00.000Z", 300, "c")
    ]);

    const buckets = buildTrendBuckets(totals, "quarter", today);

    expect(buckets).toHaveLength(3);
    expect(buckets.map((bucket) => bucket.volume)).toEqual([100, 200, 300]);
  });

  it("does not divide by zero when there is no data at all", () => {
    const buckets = buildTrendBuckets(new Map(), "month", new Date(2026, 7, 26));

    expect(buckets.every((bucket) => bucket.volume === 0)).toBe(true);
  });
});
