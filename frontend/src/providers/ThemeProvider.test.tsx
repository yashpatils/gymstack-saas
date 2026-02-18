import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useThemeConfig } from "./ThemeProvider";

vi.mock("./AuthProvider", () => ({
  useAuth: () => ({ tenantFeatures: null, activeTenant: null }),
}));

function ThemeProbe() {
  const { themeMode, setThemeMode } = useThemeConfig();
  return (
    <>
      <p data-testid="theme-mode">{themeMode}</p>
      <button type="button" onClick={() => setThemeMode("light")}>set-light</button>
      <button type="button" onClick={() => setThemeMode("dark")}>set-dark</button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "";
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const style = document.createElement("style");
    style.dataset.testid = "theme-vars";
    style.textContent = `
      html[data-theme="light"] { --background: rgb(242, 245, 250); }
      html[data-theme="dark"] { --background: rgb(7, 10, 20); }
      body { background-color: var(--background); }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    document.head.querySelector('[data-testid="theme-vars"]')?.remove();
  });

  it("persists dark mode and restores html theme on reload", async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "set-dark" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(window.localStorage.getItem("gymstack.themeMode")).toBe("dark");
    });

    firstRender.unmount();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-mode")).toHaveTextContent("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });

  it("changes computed background color between light and dark", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "set-light" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    const lightBackground = window.getComputedStyle(document.body).backgroundColor;

    await user.click(screen.getByRole("button", { name: "set-dark" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    const darkBackground = window.getComputedStyle(document.body).backgroundColor;

    expect(lightBackground).not.toBe(darkBackground);
  });
});
