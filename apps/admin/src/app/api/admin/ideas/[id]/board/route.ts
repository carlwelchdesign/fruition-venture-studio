import { getAdminSession } from "@/lib/admin-session";
import {
  createBoardTurn,
  getBoardSession,
} from "@/lib/board-service";
import {
  isBoardSpecialistRole,
  type BoardChannel,
} from "@/lib/board-contract";

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

function selectorFromValues({
  ideaId,
  researchRunId,
  channel,
  specialistRole,
}: {
  ideaId: string;
  researchRunId: unknown;
  channel: unknown;
  specialistRole: unknown;
}) {
  const normalizedChannel: BoardChannel =
    channel === "DIRECT" ? "DIRECT" : "BOARD";
  const normalizedRole =
    normalizedChannel === "DIRECT" && isBoardSpecialistRole(specialistRole)
      ? specialistRole
      : null;

  return {
    ideaId,
    researchRunId:
      typeof researchRunId === "string" ? researchRunId.trim() : "",
    channel: normalizedChannel,
    specialistRole: normalizedRole,
  };
}

function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("Complete research") ||
    message.includes("Choose a specialist") ||
    message.includes("Board messages")
  ) {
    return message;
  }
  return "The board could not complete this turn. Nothing was changed; please try again.";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminSession())) {
    return Response.json(
      { message: "Your admin session has expired." },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const { id } = await params;
  const url = new URL(request.url);
  const selector = selectorFromValues({
    ideaId: id,
    researchRunId: url.searchParams.get("researchRunId"),
    channel: url.searchParams.get("channel"),
    specialistRole: url.searchParams.get("specialistRole"),
  });

  try {
    return Response.json(await getBoardSession(selector), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    return Response.json(
      { message: publicError(error) },
      { status: 400, headers: noStoreHeaders },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  let input: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid body");
    }
    input = parsed as Record<string, unknown>;
  } catch {
    return Response.json(
      { message: "Enter a message for the board." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const { id } = await params;
  const selector = selectorFromValues({
    ideaId: id,
    researchRunId: input.researchRunId,
    channel: input.channel,
    specialistRole: input.specialistRole,
  });

  try {
    const snapshot = await createBoardTurn({
      selector,
      actorUserId: session.user.id,
      message: typeof input.message === "string" ? input.message : "",
      allowWebResearch: input.allowWebResearch === true,
    });
    return Response.json(snapshot, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Board turn failed", {
      category: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { message: publicError(error) },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
