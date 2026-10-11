import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SupersetCarousel, buildSupersetStack } from "./App";

const members = [
  { id: "a", name: "Пэкдэк" },
  { id: "b", name: "Поднятие грифа перед собой" },
  { id: "c", name: "Разводки" }
];

describe("buildSupersetStack", () => {
  test("puts the current exercise in slot 0 and the others in cycle order", () => {
    expect(buildSupersetStack(members, "a").map((item) => [item.id, item.slot])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2]
    ]);
  });

  test("wraps around: with the last exercise current the first one is next", () => {
    const slots = Object.fromEntries(
      buildSupersetStack(members, "c").map((item) => [item.id, item.slot])
    );

    expect(slots).toEqual({ a: 1, b: 2, c: 0 });
  });

  test("two exercises: with B current, A is next", () => {
    const slots = Object.fromEntries(
      buildSupersetStack(members.slice(0, 2), "b").map((item) => [item.id, item.slot])
    );

    expect(slots).toEqual({ a: 1, b: 0 });
  });

  test("a single exercise or an unknown current id builds no stack", () => {
    expect(buildSupersetStack(members.slice(0, 1), "a")).toEqual([]);
    expect(buildSupersetStack(members, "missing")).toEqual([]);
  });
});

describe("SupersetCarousel", () => {
  test("renders every name, marks the current one and shows one arrow on the left", () => {
    render(<SupersetCarousel currentId="a" members={members.slice(0, 2)} />);

    const current = screen.getByText("Пэкдэк");
    const next = screen.getByText("Поднятие грифа перед собой");

    expect(current).toHaveAttribute("aria-current", "true");
    expect(current).toHaveAttribute("data-slot", "0");
    expect(next).toHaveAttribute("data-slot", "1");
    expect(next).not.toHaveAttribute("aria-current");
    expect(screen.getAllByTestId("superset-arrow")).toHaveLength(1);
  });

  test("rotates when the current exercise changes", () => {
    const { rerender } = render(
      <SupersetCarousel currentId="a" members={members.slice(0, 2)} />
    );

    rerender(<SupersetCarousel currentId="b" members={members.slice(0, 2)} />);

    expect(screen.getByText("Поднятие грифа перед собой")).toHaveAttribute("data-slot", "0");
    expect(screen.getByText("Пэкдэк")).toHaveAttribute("data-slot", "1");
  });

  test("renders nothing for a single exercise", () => {
    const { container } = render(
      <SupersetCarousel currentId="a" members={members.slice(0, 1)} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
