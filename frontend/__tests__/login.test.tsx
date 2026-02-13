import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../app/login/page";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const loginMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("../src/providers/AuthProvider", () => ({
  useAuth: () => ({
    login: loginMock,
    loading: false,
    user: null,
  }),
}));

vi.mock("../src/components/toast/ToastProvider", () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    loginMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("shows validation and does not submit with short password", async () => {
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(loginMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("submits credentials and routes to context chooser for multi-membership users", async () => {
    loginMock.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      memberships: [{ id: "m1" }, { id: "m2" }],
    });

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("user@example.com", "password123");
      expect(pushMock).toHaveBeenCalledWith("/platform/context");
      expect(toastSuccessMock).toHaveBeenCalledWith("Logged in", "Welcome back to GymStack.");
    });
  });

  it("updates signup link with the selected persona", async () => {
    render(<LoginPage />);

    await userEvent.click(screen.getByRole("button", { name: "Manager / Admin" }));

    expect(screen.getByRole("link", { name: "Create an admin account" })).toHaveAttribute("href", "/signup?role=ADMIN");
  });
});
