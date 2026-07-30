import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  allowAdminSignIn: vi.fn(),
  isAllowedAdminEmail: vi.fn(),
  signInMagicLink: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { signInMagicLink: mocks.signInMagicLink } },
}));
vi.mock("@/lib/admin-access", () => ({
  isAllowedAdminEmail: mocks.isAllowedAdminEmail,
}));
vi.mock("@/lib/development-magic-links", () => ({
  consumeDevelopmentMagicLink: vi.fn(),
}));
vi.mock("@/lib/sign-in-throttle", () => ({
  allowAdminSignIn: mocks.allowAdminSignIn,
  getClientAddress: () => "203.0.113.10",
}));

import { POST } from "./route";

function request(email: string) {
  return new Request("https://admin.example/api/admin/sign-in", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "admin.example",
      origin: "https://admin.example",
    },
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowAdminSignIn.mockResolvedValue(true);
  mocks.isAllowedAdminEmail.mockReturnValue(false);
});

describe("POST /api/admin/sign-in", () => {
  it("does not reveal whether an email is authorized", async () => {
    const unauthorized = await POST(request("visitor@example.com"));
    const unauthorizedBody = await unauthorized.json();

    mocks.isAllowedAdminEmail.mockReturnValue(true);
    mocks.signInMagicLink.mockRejectedValue(new Error("delivery unavailable"));
    const authorized = await POST(request("owner@example.com"));

    expect(unauthorized.status).toBe(202);
    expect(authorized.status).toBe(202);
    await expect(authorized.json()).resolves.toEqual(unauthorizedBody);
  });

  it("does not invoke authentication for an unauthorized email", async () => {
    await POST(request("visitor@example.com"));

    expect(mocks.signInMagicLink).not.toHaveBeenCalled();
  });

  it("returns 429 when the database throttle denies the attempt", async () => {
    mocks.allowAdminSignIn.mockResolvedValue(false);

    const response = await POST(request("owner@example.com"));

    expect(response.status).toBe(429);
    expect(mocks.signInMagicLink).not.toHaveBeenCalled();
  });

  it("rejects cross-origin attempts before consuming a throttle event", async () => {
    const crossOriginRequest = request("owner@example.com");
    crossOriginRequest.headers.set("origin", "https://attacker.example");

    const response = await POST(crossOriginRequest);

    expect(response.status).toBe(403);
    expect(mocks.allowAdminSignIn).not.toHaveBeenCalled();
    expect(mocks.signInMagicLink).not.toHaveBeenCalled();
  });
});
