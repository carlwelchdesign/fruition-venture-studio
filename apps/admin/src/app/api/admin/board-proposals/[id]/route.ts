import { getAdminSession } from "@/lib/admin-session";
import { reviewBoardProposal } from "@/lib/board-service";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function PATCH(
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

  const origin = request.headers.get("origin");
  let originMatches = true;
  try {
    originMatches = !origin || new URL(origin).host === new URL(request.url).host;
  } catch {
    originMatches = false;
  }
  if (!originMatches) {
    return Response.json(
      { message: "This request could not be verified." },
      { status: 403, headers: noStoreHeaders },
    );
  }

  let decision: unknown;
  try {
    decision = (await request.json() as { decision?: unknown }).decision;
  } catch {
    decision = null;
  }
  if (decision !== "ACCEPTED" && decision !== "DISMISSED") {
    return Response.json(
      { message: "Choose whether to accept or dismiss this proposal." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const { id } = await params;
    const result = await reviewBoardProposal({
      proposalId: id,
      actorUserId: session.user.id,
      decision,
    });
    return Response.json(result, { headers: noStoreHeaders });
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("already been reviewed"))
        ? error.message
        : "The score proposal could not be updated.";
    return Response.json(
      { message },
      { status: 400, headers: noStoreHeaders },
    );
  }
}
