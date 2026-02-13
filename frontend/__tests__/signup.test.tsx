import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "../app/signup/page";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const signupMock = vi.fn();
const toastErrorMock = vi.fn();
const getSearchParamMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: getSearchParamMock }),
}));

vi.mock("../src/providers/AuthProvider", () => ({
  useAuth: () => ({
    signup: signupMock,
    loading: false,
    user: null,
  }),
}));

vi.mock("../src/components/toast/ToastProvider", () => ({
  useToast: () => ({
    error: toastErrorMock,
  }),
}));

describe("SignupPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    signupMock.mockReset();
    toastErrorMock.mockReset();
    getSearchParamMock.mockReset();
    getSearchParamMock.mockReturnValue(null);
  });

  it("uses role from query params and submits it", async () => {
    getSearchParamMock.mockImplementation((key: string) => (key === "role" ? "ADMIN" : null));
    signupMock.mockResolvedValue({
      user: { id: "u1", email: "admin@example.com" },
      memberships: [],
    });

    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Email"), "admin@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalledWith("admin@example.com", "password123", "ADMIN");
      expect(pushMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("lets users switch role cards before submit", async () => {
    signupMock.mockResolvedValue({ user: { id: "u1", email: "coach@example.com" }, memberships: [] });

    render(<SignupPage />);

    await userEvent.click(screen.getByRole("button", { name: "Coach / Staff" }));
    await userEvent.type(screen.getByLabelText("Email"), "coach@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalledWith("coach@example.com", "password123", "USER");
    });
  });
});
