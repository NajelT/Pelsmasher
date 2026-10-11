import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import {
  RecordedSetStrip,
  SupersetTracker,
  buildSupersetTracker,
  readSupersetTrackerEnabled
} from "./App";

const members = [{ id: "a" }, { id: "b" }, { id: "c" }];
const pickers = { reps: 8, weight: 80 };

describe("buildSupersetTracker", () => {
  test("first round, nothing logged: current shows the picker values, the partner is next", () => {
    const nodes = buildSupersetTracker(members.slice(0, 2), "a", 1, {}, pickers);

    expect(nodes).toEqual([
      { id: "a", label: "1A", state: "current", text: "80 × 8" },
      { id: "b", label: "1B", state: "next", text: "next" }
    ]);
  });

  test("a partner that already did its set this round is done and shows the logged values", () => {
    const logs = {
      a: [
        { reps: 8, weight: 80 },
        { reps: 8, weight: 80 },
        { reps: 6, weight: 82.5 }
      ]
    };
    const nodes = buildSupersetTracker(members.slice(0, 2), "b", 3, logs, { reps: 12, weight: 40 });

    expect(nodes[0]).toEqual({ id: "a", label: "3A", state: "done", text: "82.5 × 6" });
    expect(nodes[1]).toEqual({ id: "b", label: "3B", state: "current", text: "40 × 12" });
  });

  test("a partner that only did earlier rounds is still next in this round", () => {
    const logs = { b: [{ reps: 12, weight: 40 }] };
    const nodes = buildSupersetTracker(members.slice(0, 2), "a", 2, logs, pickers);

    expect(nodes[1].state).toBe("next");
  });

  test("three exercises get the letters A, B, C with the round number", () => {
    expect(buildSupersetTracker(members, "a", 3, {}, pickers).map((node) => node.label)).toEqual([
      "3A",
      "3B",
      "3C"
    ]);
  });

  test("a single exercise, or a current exercise outside the list, builds nothing", () => {
    expect(buildSupersetTracker(members.slice(0, 1), "a", 1, {}, pickers)).toEqual([]);
    expect(buildSupersetTracker(members, "missing", 1, {}, pickers)).toEqual([]);
  });
});

describe("SupersetTracker", () => {
  test("renders a node per exercise with its state and a green link after a done node", () => {
    const { container } = render(
      <SupersetTracker
        nodes={[
          { id: "a", label: "3A", state: "done", text: "80 × 8" },
          { id: "b", label: "3B", state: "current", text: "40 × 12" },
          { id: "c", label: "3C", state: "next", text: "next" }
        ]}
      />
    );

    expect(screen.getByText("3B").closest(".superset-tracker-node")).toHaveClass("is-current");
    expect(screen.getByText("3A").closest(".superset-tracker-node")).toHaveClass("is-done");
    expect(screen.getByText("3C").closest(".superset-tracker-node")).toHaveClass("is-next");
    expect(screen.getByText("3B").closest(".superset-tracker-node")).toHaveAttribute(
      "aria-current",
      "step"
    );

    const links = screen.getAllByTestId("superset-tracker-link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveClass("is-done");
    expect(links[1]).not.toHaveClass("is-done");
    expect(container.querySelectorAll(".superset-tracker-node")).toHaveLength(3);
  });

  test("renders nothing without nodes", () => {
    const { container } = render(<SupersetTracker nodes={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("RecordedSetStrip letter", () => {
  const sets = [{ id: "s1", reps: 8, weight: 80 }];
  const noop = () => undefined;

  test("shows the exercise letter after the set number in a superset", () => {
    render(<RecordedSetStrip letter="A" sets={sets} selectedId={null} onSelect={noop} onDelete={noop} />);

    expect(screen.getByText("1A: 80 x 8")).toBeInTheDocument();
  });

  test("shows the plain number without a letter", () => {
    render(<RecordedSetStrip sets={sets} selectedId={null} onSelect={noop} onDelete={noop} />);

    expect(screen.getByText("1: 80 x 8")).toBeInTheDocument();
  });
});

describe("readSupersetTrackerEnabled", () => {
  beforeEach(() => window.localStorage.clear());

  test("is on by default", () => {
    expect(readSupersetTrackerEnabled()).toBe(true);
  });

  test("is off when stored as false and on when stored as true", () => {
    window.localStorage.setItem("pelsmasher.supersetTracker", "false");
    expect(readSupersetTrackerEnabled()).toBe(false);

    window.localStorage.setItem("pelsmasher.supersetTracker", "true");
    expect(readSupersetTrackerEnabled()).toBe(true);
  });
});
