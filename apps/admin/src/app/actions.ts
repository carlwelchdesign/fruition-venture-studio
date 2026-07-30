"use server";

import { start } from "workflow/api";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@fruition/database";
import { requireAdmin } from "@/lib/admin-session";
import { describeResearchError } from "@/agents/research-errors";
import type {
  ResearchActionState,
  ResearchRunSnapshot,
} from "@/lib/research-progress";
import { researchIdeaWorkflow } from "@/workflows/research-workflow";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signOutAction() {
  await requireAdmin();
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

function researchRunSnapshot(run: {
  id: string;
  version: number;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  model: string;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
  _count: { reports: number };
}): ResearchRunSnapshot {
  return {
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
}

async function prepareResearchRun(ideaId: string, actorUserId: string) {
  return prisma.$transaction(async (transaction) => {
    const idea = await transaction.idea.findUnique({
      where: { id: ideaId },
      include: {
        researchRuns: {
          where: { status: { in: ["QUEUED", "RUNNING"] } },
          take: 1,
          include: { _count: { select: { reports: true } } },
        },
        _count: { select: { researchRuns: true } },
      },
    });

    if (!idea) {
      throw new Error("Idea not found.");
    }

    if (idea.researchRuns.length > 0) {
      return idea.researchRuns[0];
    }

    const run = await transaction.researchRun.create({
      data: {
        ideaId,
        version: idea._count.researchRuns + 1,
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
      },
      include: { _count: { select: { reports: true } } },
    });

    await transaction.idea.update({
      where: { id: ideaId },
      data: { status: "APPROVED" },
    });

    await transaction.auditEvent.create({
      data: {
        actorUserId,
        action: "RESEARCH_APPROVED",
        entityType: "Idea",
        entityId: ideaId,
        metadata: { researchRunId: run.id, version: run.version },
      },
    });

    return run;
  });
}

export async function approveAndResearchAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const session = await requireAdmin();
  const ideaId = stringValue(formData, "ideaId");

  let researchRun: Awaited<ReturnType<typeof prepareResearchRun>>;

  try {
    researchRun = await prepareResearchRun(ideaId, session.user.id);
  } catch (error) {
    return {
      outcome: "error",
      message: describeResearchError(error),
      run: null,
    };
  }

  try {
    const workflow = await start(researchIdeaWorkflow, [researchRun.id]);
    const queuedRun = await prisma.researchRun.update({
      where: { id: researchRun.id },
      data: { workflowRunId: workflow.runId },
      include: { _count: { select: { reports: true } } },
    });
    revalidatePath(`/ideas/${ideaId}`);
    revalidatePath("/");
    return {
      outcome: "started",
      message: "Research commissioned.",
      run: researchRunSnapshot(queuedRun),
    };
  } catch (error) {
    const message = describeResearchError(error);
    const failedRun = await prisma.researchRun.update({
      where: { id: researchRun.id },
      data: {
        status: "FAILED",
        errorMessage: message.slice(0, 1000),
        completedAt: new Date(),
        idea: { update: { status: "RESEARCH_FAILED" } },
      },
      include: { _count: { select: { reports: true } } },
    });
    revalidatePath(`/ideas/${ideaId}`);
    revalidatePath("/");
    return {
      outcome: "error",
      message,
      run: researchRunSnapshot(failedRun),
    };
  }
}

export async function setDispositionAction(formData: FormData) {
  const session = await requireAdmin();
  const ideaId = stringValue(formData, "ideaId");
  const disposition = stringValue(formData, "disposition");
  const reason = stringValue(formData, "reason");

  if (!["EXPLORE", "HOLD", "DECLINE"].includes(disposition) || !reason) {
    throw new Error("A disposition and decision reason are required.");
  }

  await prisma.$transaction([
    prisma.idea.update({
      where: { id: ideaId },
      data: {
        disposition: disposition as "EXPLORE" | "HOLD" | "DECLINE",
        status: "DECIDED",
        decidedAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "DISPOSITION_SET",
        entityType: "Idea",
        entityId: ideaId,
        reason,
        metadata: { disposition },
      },
    }),
  ]);

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/");
}

export async function archiveIdeaAction(formData: FormData) {
  const session = await requireAdmin();
  const ideaId = stringValue(formData, "ideaId");
  const reason = stringValue(formData, "reason");

  if (!reason) {
    throw new Error("An archive reason is required.");
  }

  await prisma.$transaction([
    prisma.idea.update({
      where: { id: ideaId },
      data: { status: "ARCHIVED" },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "IDEA_ARCHIVED",
        entityType: "Idea",
        entityId: ideaId,
        reason,
      },
    }),
  ]);

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/");
}

export async function addNoteAction(formData: FormData) {
  const session = await requireAdmin();
  const ideaId = stringValue(formData, "ideaId");
  const body = stringValue(formData, "body");

  if (body.length < 2 || body.length > 4000) {
    throw new Error("Notes must be between 2 and 4,000 characters.");
  }

  await prisma.adminNote.create({
    data: {
      ideaId,
      authorId: session.user.id,
      body,
    },
  });

  revalidatePath(`/ideas/${ideaId}`);
}

export async function overrideScoreAction(formData: FormData) {
  const session = await requireAdmin();
  const dimensionId = stringValue(formData, "dimensionId");
  const ideaId = stringValue(formData, "ideaId");
  const score = Number(stringValue(formData, "score"));
  const reason = stringValue(formData, "reason");

  if (!Number.isFinite(score) || score < 0 || score > 5 || !reason) {
    throw new Error("Choose a score from 0 to 5 and provide a reason.");
  }

  const dimension = await prisma.scoreDimension.update({
    where: { id: dimensionId },
    data: {
      overrideScore: score,
      overrideReason: reason,
      overriddenAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorUserId: session.user.id,
      action: "SCORE_OVERRIDDEN",
      entityType: "ScoreDimension",
      entityId: dimensionId,
      reason,
      metadata: { aiScore: dimension.aiScore, overrideScore: score },
    },
  });

  revalidatePath(`/ideas/${ideaId}`);
}

export async function mergeSubmitterAction(formData: FormData) {
  const session = await requireAdmin();
  const sourceSubmitterId = stringValue(formData, "sourceSubmitterId");
  const targetEmail = stringValue(formData, "targetEmail").toLowerCase();
  const reason = stringValue(formData, "reason");

  if (!targetEmail || !reason) {
    throw new Error("A target email and reason are required.");
  }

  const target = await prisma.submitter.findUnique({
    where: { normalizedEmail: targetEmail },
  });

  if (!target || target.id === sourceSubmitterId) {
    throw new Error("Choose another existing submitter email.");
  }

  await prisma.$transaction([
    prisma.idea.updateMany({
      where: { submitterId: sourceSubmitterId },
      data: { submitterId: target.id },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "SUBMITTER_MERGED",
        entityType: "Submitter",
        entityId: sourceSubmitterId,
        reason,
        metadata: { targetSubmitterId: target.id },
      },
    }),
    prisma.submitter.delete({ where: { id: sourceSubmitterId } }),
  ]);

  redirect(`/submitters/${target.id}`);
}

export async function moveIdeaAction(formData: FormData) {
  const session = await requireAdmin();
  const ideaId = stringValue(formData, "ideaId");
  const email = stringValue(formData, "email").toLowerCase();
  const name = stringValue(formData, "name");
  const reason = stringValue(formData, "reason");

  if (!email || !name || !reason) {
    throw new Error("Name, email, and reason are required.");
  }

  const submitter = await prisma.submitter.upsert({
    where: { normalizedEmail: email },
    create: { normalizedEmail: email, email, name },
    update: { email, name },
  });

  await prisma.$transaction([
    prisma.idea.update({
      where: { id: ideaId },
      data: { submitterId: submitter.id },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "IDEA_REASSIGNED",
        entityType: "Idea",
        entityId: ideaId,
        reason,
        metadata: { targetSubmitterId: submitter.id },
      },
    }),
  ]);

  revalidatePath(`/ideas/${ideaId}`);
}

export async function anonymizeSubmitterAction(formData: FormData) {
  const session = await requireAdmin();
  const submitterId = stringValue(formData, "submitterId");
  const reason = stringValue(formData, "reason");

  if (stringValue(formData, "confirm") !== "ANONYMIZE" || !reason) {
    throw new Error("Type ANONYMIZE and provide a reason.");
  }

  const anonymizedEmail = `anonymized+${submitterId}@deleted.invalid`;

  await prisma.$transaction([
    prisma.submitter.update({
      where: { id: submitterId },
      data: {
        normalizedEmail: anonymizedEmail,
        email: anonymizedEmail,
        name: "Anonymized submitter",
        organization: null,
        anonymizedAt: new Date(),
        ideas: {
          updateMany: {
            where: {},
            data: {
              nameSnapshot: "Anonymized submitter",
              emailSnapshot: anonymizedEmail,
              organization: null,
            },
          },
        },
      },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "SUBMITTER_ANONYMIZED",
        entityType: "Submitter",
        entityId: submitterId,
        reason,
      },
    }),
  ]);

  revalidatePath(`/submitters/${submitterId}`);
}

export async function deleteSubmitterAction(formData: FormData) {
  const session = await requireAdmin();
  const submitterId = stringValue(formData, "submitterId");
  const reason = stringValue(formData, "reason");

  if (stringValue(formData, "confirm") !== "DELETE" || !reason) {
    throw new Error("Type DELETE and provide a reason.");
  }

  await prisma.$transaction([
    prisma.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "SUBMITTER_DELETED",
        entityType: "Submitter",
        entityId: submitterId,
        reason,
      },
    }),
    prisma.submitter.delete({ where: { id: submitterId } }),
  ]);

  redirect("/");
}
