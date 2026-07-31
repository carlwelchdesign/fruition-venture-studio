import { getAdminSession } from "@/lib/admin-session";
import {
  generateFounderBrief,
  publishFounderBrief,
  revokeFounderBrief,
  saveFounderBrief,
} from "@/lib/founder-brief-service";

type RouteContext = { params: Promise<{ id: string }> };
export const maxDuration = 300;

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }
  try {
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      request.headers.get("host") ??
      new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The Opportunity Brief request could not be completed.";
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json(
      { message: "Your admin session has expired." },
      { status: 401, headers: noStoreHeaders },
    );
  }
  if (!sameOrigin(request)) {
    return Response.json(
      { message: "This request could not be verified." },
      { status: 403, headers: noStoreHeaders },
    );
  }
  const { id: ideaId } = await params;

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { message: "The request body is invalid." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    if (input.action === "generate") {
      const brief = await generateFounderBrief(ideaId, session.user.id);
      return Response.json(
        {
          outcome: "generated",
          briefId: brief.id,
          message: "A founder-safe draft is ready for your review.",
        },
        { headers: noStoreHeaders },
      );
    }

    const briefId = typeof input.briefId === "string" ? input.briefId : "";
    if (!briefId) {
      return Response.json(
        { message: "Choose an Opportunity Brief." },
        { status: 400, headers: noStoreHeaders },
      );
    }

    if (input.action === "save") {
      await saveFounderBrief(ideaId, briefId, input.brief, session.user.id);
      return Response.json(
        {
          outcome: "saved",
          message: "Draft saved and marked as reviewed.",
        },
        { headers: noStoreHeaders },
      );
    }

    if (input.action === "publish") {
      const result = await publishFounderBrief(
        ideaId,
        briefId,
        session.user.id,
      );
      return Response.json(
        {
          outcome: result.delivered ? "published" : "delivery_failed",
          message: result.delivered
            ? "The private brief was published and emailed."
            : "The brief was published, but its email could not be delivered. You can retry without regenerating it.",
        },
        { headers: noStoreHeaders },
      );
    }

    if (input.action === "revoke") {
      await revokeFounderBrief(
        ideaId,
        briefId,
        session.user.id,
        typeof input.reason === "string" ? input.reason : "",
      );
      return Response.json(
        {
          outcome: "revoked",
          message: "The private link has been revoked.",
        },
        { headers: noStoreHeaders },
      );
    }

    return Response.json(
      { message: "Choose a supported Opportunity Brief action." },
      { status: 400, headers: noStoreHeaders },
    );
  } catch (error) {
    return Response.json(
      { message: errorMessage(error) },
      { status: 400, headers: noStoreHeaders },
    );
  }
}
