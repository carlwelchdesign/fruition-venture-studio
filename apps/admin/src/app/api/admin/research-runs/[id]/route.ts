import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@fruition/database";
import type { ResearchRunSnapshot } from "@/lib/research-progress";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminSession())) {
    return Response.json(
      { message: "Your admin session has expired." },
      {
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const { id } = await params;
  const run = await prisma.researchRun.findUnique({
    where: { id },
    include: {
      _count: { select: { reports: true } },
    },
  });

  if (!run) {
    return Response.json(
      { message: "Research run not found." },
      {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const snapshot: ResearchRunSnapshot = {
    id: run.id,
    version: run.version,
    status: run.status,
    model: run.model,
    reportCount: run._count.reports,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    updatedAt: run.updatedAt.toISOString(),
  };

  return Response.json(snapshot, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
