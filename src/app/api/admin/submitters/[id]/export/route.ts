import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminSession())) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const submitter = await prisma.submitter.findUnique({
    where: { id },
    include: {
      ideas: {
        include: {
          notes: true,
          researchRuns: {
            include: {
              reports: { include: { sources: true } },
              scorecard: { include: { dimensions: true } },
            },
          },
        },
      },
    },
  });

  if (!submitter) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  return new Response(JSON.stringify(submitter, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fruition-submitter-${id}.json"`,
    },
  });
}
