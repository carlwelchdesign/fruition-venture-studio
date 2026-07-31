import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  generateFounderBrief: vi.fn(),
  publishFounderBrief: vi.fn(),
  revokeFounderBrief: vi.fn(),
  saveFounderBrief: vi.fn(),
}));

vi.mock("@/lib/admin-session", () => ({
  getAdminSession: mocks.getAdminSession,
}));
vi.mock("@/lib/founder-brief-service", () => ({
  generateFounderBrief: mocks.generateFounderBrief,
  publishFounderBrief: mocks.publishFounderBrief,
  revokeFounderBrief: mocks.revokeFounderBrief,
  saveFounderBrief: mocks.saveFounderBrief,
}));

import { POST } from "./route";

function request(body: unknown, origin = "https://admin.example") {
  return new Request("https://admin.example/api/admin/ideas/idea-1/founder-brief", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "admin.example",
      origin,
    },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: "idea-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAdminSession.mockResolvedValue({
    user: { id: "owner-1", email: "owner@example.com" },
  });
});

describe("POST /api/admin/ideas/[id]/founder-brief", () => {
  it("returns 401 without exposing brief state when the session is missing", async () => {
    mocks.getAdminSession.mockResolvedValue(null);

    const response = await POST(request({ action: "generate" }), context);

    expect(response.status).toBe(401);
    expect(mocks.generateFounderBrief).not.toHaveBeenCalled();
  });

  it("rejects cross-origin mutations", async () => {
    const response = await POST(
      request({ action: "generate" }, "https://attacker.example"),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks.generateFounderBrief).not.toHaveBeenCalled();
  });

  it("binds a saved brief to the idea in the route", async () => {
    mocks.saveFounderBrief.mockResolvedValue({ id: "brief-1" });

    const response = await POST(
      request({
        action: "save",
        briefId: "brief-1",
        brief: { title: "Draft", content: {} },
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.saveFounderBrief).toHaveBeenCalledWith(
      "idea-1",
      "brief-1",
      { title: "Draft", content: {} },
      "owner-1",
    );
  });
});
