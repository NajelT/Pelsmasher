import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";

const authResponse = {
  token: "test-token",
  user: {
    displayName: "test@example.com",
    email: "test@example.com",
    id: "user-1"
  }
};

describe("auth screen", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  test("shows a login form without repeat password first", () => {
    mockApi();

    render(<App />);

    expect(screen.getByRole("heading", { name: "Log in" })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.queryByLabelText("Repeat password")).toBeNull();
  });

  test("switches to registration mode and shows repeat password only there", async () => {
    mockApi();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("heading", { name: "Register" })).toBeTruthy();
    expect(screen.getByLabelText("Repeat password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log in" })).toBeTruthy();
  });

  test("submits login without repeat password", async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(findFetchCall(fetchMock, "/auth/login")).toBeTruthy();
    });

    const loginCall = findFetchCall(fetchMock, "/auth/login");
    const payload = JSON.parse(loginCall?.[1]?.body as string);

    expect(payload).toEqual({
      email: "test@example.com",
      password: "secret123"
    });
    expect(payload.repeatPassword).toBeUndefined();
  });

  test("submits registration with repeat password", async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.type(screen.getByLabelText("Repeat password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(findFetchCall(fetchMock, "/auth/register")).toBeTruthy();
    });

    const registerCall = findFetchCall(fetchMock, "/auth/register");
    const payload = JSON.parse(registerCall?.[1]?.body as string);

    expect(payload).toEqual({
      email: "test@example.com",
      password: "secret123",
      repeatPassword: "secret123"
    });
  });

  test("does not call register API for invalid email", async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.type(screen.getByLabelText("Email"), "najel");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.type(screen.getByLabelText("Repeat password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Enter a valid email")).toBeTruthy();
    expect(findFetchCall(fetchMock, "/auth/register")).toBeUndefined();
  });

  test("shows logout button on the settings screen after login", async () => {
    mockApi();
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("heading", { name: "Choose workout" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Open settings" }));

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  });
});

function mockApi() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = input.toString();

    if (url.includes("/auth/login") || url.includes("/auth/register")) {
      return jsonResponse(authResponse);
    }

    if (url.includes("/muscle-groups")) {
      return jsonResponse([]);
    }

    return jsonResponse({ error: "Not Found" }, 404);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status
  });
}

function findFetchCall(fetchMock: ReturnType<typeof mockApi>, path: string) {
  return fetchMock.mock.calls.find((call) => call[0].toString().includes(path));
}
