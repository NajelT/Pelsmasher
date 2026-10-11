import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { RecordedSetStrip, removeLoggedSet, updateLoggedSet } from "./App";

const sets = [
  { id: "s1", reps: 8, weight: 80, performedAt: "2026-10-11T10:00:00Z" },
  { id: "s2", reps: 12, weight: 47.5, performedAt: "2026-10-11T10:05:00Z" },
  { id: "s3", reps: 10, weight: 50, performedAt: "2026-10-11T10:10:00Z" }
];

describe("removeLoggedSet", () => {
  test("removes only the set with that id and keeps the order of the others", () => {
    expect(removeLoggedSet(sets, "s2").map((set) => set.id)).toEqual(["s1", "s3"]);
  });

  test("an unknown id changes nothing", () => {
    expect(removeLoggedSet(sets, "missing")).toEqual(sets);
  });
});

describe("updateLoggedSet", () => {
  test("changes weight and reps of that set only, keeping its id and time", () => {
    const updated = updateLoggedSet(sets, "s2", 50, 10);

    expect(updated[1]).toEqual({
      id: "s2",
      performedAt: "2026-10-11T10:05:00Z",
      reps: 10,
      weight: 50
    });
    expect(updated[0]).toEqual(sets[0]);
    expect(updated[2]).toEqual(sets[2]);
  });

  test("an unknown id changes nothing", () => {
    expect(updateLoggedSet(sets, "missing", 1, 1)).toEqual(sets);
  });
});

describe("RecordedSetStrip", () => {
  test("shows the empty state and no chips when nothing is logged", () => {
    render(<RecordedSetStrip sets={[]} selectedId={null} onSelect={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("No sets logged yet")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("lists numbered sets and reports a tap on a chip", async () => {
    const onSelect = vi.fn();
    render(<RecordedSetStrip sets={sets} selectedId={null} onSelect={onSelect} onDelete={vi.fn()} />);

    expect(screen.getByText("1: 80 x 8")).toBeInTheDocument();
    expect(screen.getByText("2: 47.5 x 12")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit set 2" }));

    expect(onSelect).toHaveBeenCalledWith("s2");
  });

  test("only the selected chip shows a delete button, and it reports the delete", async () => {
    const onDelete = vi.fn();
    render(<RecordedSetStrip sets={sets} selectedId="s2" onSelect={vi.fn()} onDelete={onDelete} />);

    expect(screen.getAllByRole("button", { name: /Delete set/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Edit set 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Edit set 1" })).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(screen.getByRole("button", { name: "Delete set 2" }));

    expect(onDelete).toHaveBeenCalledWith("s2");
  });

  test("tapping the selected chip again reports it so the edit can be cancelled", async () => {
    const onSelect = vi.fn();
    render(<RecordedSetStrip sets={sets} selectedId="s2" onSelect={onSelect} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit set 2" }));

    expect(onSelect).toHaveBeenCalledWith("s2");
  });
});
