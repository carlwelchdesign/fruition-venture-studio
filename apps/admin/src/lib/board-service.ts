import "server-only";

import type { Prisma } from "@fruition/database";
import { prisma } from "@fruition/database";
import {
  runDirectSpecialistTurn,
  runModeratedBoardTurn,
  type BoardEvidenceContext,
} from "@/agents/board-team";
import {
  boardSpecialistRoles,
  isBoardSpecialistRole,
  type BoardChannel,
  type BoardMessage,
  type BoardSessionSnapshot,
  type BoardSpecialistRole,
} from "@/lib/board-contract";

type SessionSelector = {
  ideaId: string;
  researchRunId: string;
  channel: BoardChannel;
  specialistRole: BoardSpecialistRole | null;
};

const messageInclude = {
  scoreProposals: {
    include: {
      scoreDimension: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.BoardMessageInclude;

function stringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function citations(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      typeof item.url === "string" &&
      typeof item.title === "string"
    ) {
      return [{ url: item.url, title: item.title }];
    }
    return [];
  });
}

function serializeMessage(
  message: Prisma.BoardMessageGetPayload<{ include: typeof messageInclude }>,
): BoardMessage {
  return {
    id: message.id,
    role: message.role,
    speakerRole:
      message.speakerRole === "STUDIO_SYNTHESIS" ||
      isBoardSpecialistRole(message.speakerRole)
        ? message.speakerRole
        : null,
    contributors: stringArray(message.contributors).filter(
      isBoardSpecialistRole,
    ),
    body: message.body,
    citations: citations(message.citations),
    unknownVariables: stringArray(message.unknownVariables),
    scoreProposals: message.scoreProposals.map((proposal) => ({
      id: proposal.id,
      dimensionKey: proposal.scoreDimension.key,
      dimensionLabel: proposal.scoreDimension.label,
      currentScore:
        proposal.scoreDimension.overrideScore ??
        proposal.scoreDimension.aiScore,
      proposedScore: proposal.proposedScore,
      rationale: proposal.rationale,
      evidence: stringArray(proposal.evidence),
      status: proposal.status,
    })),
    createdAt: message.createdAt.toISOString(),
  };
}

function sessionKey({
  researchRunId,
  channel,
  specialistRole,
}: SessionSelector) {
  return `${researchRunId}:${channel}:${
    channel === "DIRECT" ? specialistRole : "CHAIR"
  }`;
}

function validateSelector(selector: SessionSelector) {
  if (
    selector.channel === "DIRECT" &&
    !isBoardSpecialistRole(selector.specialistRole)
  ) {
    throw new Error("Choose a specialist for a direct conversation.");
  }
  if (selector.channel === "BOARD" && selector.specialistRole !== null) {
    throw new Error("The moderated board does not use a specialist role.");
  }
}

async function loadRun(selector: SessionSelector) {
  validateSelector(selector);

  const run = await prisma.researchRun.findFirst({
    where: {
      id: selector.researchRunId,
      ideaId: selector.ideaId,
      status: "COMPLETED",
    },
    include: {
      idea: true,
      reports: {
        orderBy: { role: "asc" },
        include: { sources: true },
      },
      scorecard: {
        include: { dimensions: { orderBy: { weight: "desc" } } },
      },
    },
  });

  if (!run?.scorecard) {
    throw new Error("Complete research before opening the board room.");
  }

  return { ...run, scorecard: run.scorecard };
}

async function getOrCreateSession(
  selector: SessionSelector,
  actorUserId: string,
) {
  const key = sessionKey(selector);
  return prisma.boardSession.upsert({
    where: { sessionKey: key },
    create: {
      sessionKey: key,
      ideaId: selector.ideaId,
      researchRunId: selector.researchRunId,
      createdById: actorUserId,
      channel: selector.channel,
      specialistRole: selector.specialistRole,
    },
    update: {},
  });
}

export async function getBoardSession(
  selector: SessionSelector,
): Promise<BoardSessionSnapshot> {
  const run = await loadRun(selector);
  const existing = await prisma.boardSession.findUnique({
    where: { sessionKey: sessionKey(selector) },
    include: {
      messages: {
        include: messageInclude,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return {
    id: existing?.id ?? null,
    researchRunId: run.id,
    researchVersion: run.version,
    channel: selector.channel,
    specialistRole: selector.specialistRole,
    messages: existing?.messages.map(serializeMessage) ?? [],
  };
}

function buildContext(
  run: Awaited<ReturnType<typeof loadRun>>,
  messages: BoardMessage[],
): BoardEvidenceContext {
  return {
    ideaId: run.idea.id,
    researchRunId: run.id,
    researchVersion: run.version,
    projectStage: run.idea.projectStage,
    projectDetails: run.idea.projectDetails,
    organization: run.idea.organization,
    reports: run.reports.map((report) => ({
      role: report.role,
      title: report.title,
      summary: report.summary,
      findings: report.findings,
      risks: report.risks,
      openQuestions: report.openQuestions,
      sources: report.sources.map((source) => ({
        url: source.url,
        title: source.title,
      })),
    })),
    scorecard: {
      summary: run.scorecard.summary,
      recommendation: run.scorecard.recommendation,
      dimensions: run.scorecard.dimensions.map((dimension) => ({
        key: dimension.key,
        label: dimension.label,
        aiScore: dimension.aiScore,
        effectiveScore: dimension.overrideScore ?? dimension.aiScore,
        rationale: dimension.aiRationale,
        evidence: dimension.evidence,
      })),
    },
    conversation: messages.slice(-20).map((message) => ({
      role: message.role,
      speaker:
        message.role === "USER"
          ? "Venture studio owner"
          : message.speakerRole ?? "Board",
      body: message.body,
    })),
  };
}

export async function createBoardTurn({
  selector,
  actorUserId,
  message,
  allowWebResearch,
}: {
  selector: SessionSelector;
  actorUserId: string;
  message: string;
  allowWebResearch: boolean;
}): Promise<BoardSessionSnapshot> {
  const trimmedMessage = message.trim();
  if (trimmedMessage.length < 2 || trimmedMessage.length > 12_000) {
    throw new Error("Board messages must be between 2 and 12,000 characters.");
  }

  const run = await loadRun(selector);
  const session = await getOrCreateSession(selector, actorUserId);
  const before = await getBoardSession(selector);

  const context = buildContext(run, before.messages);
  const response =
    selector.channel === "DIRECT"
      ? await runDirectSpecialistTurn({
          role: selector.specialistRole as BoardSpecialistRole,
          context,
          question: trimmedMessage,
          allowWebResearch,
        })
      : await runModeratedBoardTurn({
          context,
          question: trimmedMessage,
          allowWebResearch,
        });

  const dimensions = new Map(
    run.scorecard.dimensions.map((dimension) => [dimension.key, dimension]),
  );

  await prisma.$transaction(async (transaction) => {
    await transaction.boardMessage.create({
      data: {
        boardSessionId: session.id,
        role: "USER",
        body: trimmedMessage,
        contributors: [],
        citations: [],
        unknownVariables: [],
      },
    });

    const assistant = await transaction.boardMessage.create({
      data: {
        boardSessionId: session.id,
        role: "ASSISTANT",
        speakerRole:
          selector.channel === "DIRECT"
            ? selector.specialistRole
            : "STUDIO_SYNTHESIS",
        body: response.answer,
        contributors:
          selector.channel === "DIRECT"
            ? [selector.specialistRole as BoardSpecialistRole]
            : response.contributors.filter((role) =>
                boardSpecialistRoles.includes(role),
              ),
        citations: response.citations,
        unknownVariables: response.unknownVariables,
      },
    });

    const validProposals = response.scoreProposals.flatMap((proposal) => {
      const dimension = dimensions.get(proposal.dimensionKey);
      return dimension
        ? [
            {
              boardMessageId: assistant.id,
              scoreDimensionId: dimension.id,
              proposedScore: proposal.proposedScore,
              rationale: proposal.rationale,
              evidence: proposal.evidence,
            },
          ]
        : [];
    });

    if (validProposals.length) {
      await transaction.boardScoreProposal.createMany({
        data: validProposals,
      });
    }

    await transaction.auditEvent.create({
      data: {
        actorUserId,
        action: "BOARD_TURN_COMPLETED",
        entityType: "BoardSession",
        entityId: session.id,
        metadata: {
          researchRunId: run.id,
          channel: selector.channel,
          specialistRole: selector.specialistRole,
          webResearch: allowWebResearch,
          proposalCount: validProposals.length,
        },
      },
    });
  });

  return getBoardSession(selector);
}

export async function reviewBoardProposal({
  proposalId,
  actorUserId,
  decision,
}: {
  proposalId: string;
  actorUserId: string;
  decision: "ACCEPTED" | "DISMISSED";
}) {
  const proposal = await prisma.boardScoreProposal.findUnique({
    where: { id: proposalId },
    include: {
      scoreDimension: {
        include: {
          scorecard: {
            include: { researchRun: true },
          },
        },
      },
    },
  });

  if (!proposal) {
    throw new Error("Score proposal not found.");
  }
  if (proposal.status !== "PENDING") {
    throw new Error("This score proposal has already been reviewed.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.boardScoreProposal.update({
      where: { id: proposal.id },
      data: {
        status: decision,
        reviewedById: actorUserId,
        reviewedAt: new Date(),
      },
    });

    if (decision === "ACCEPTED") {
      await transaction.scoreDimension.update({
        where: { id: proposal.scoreDimensionId },
        data: {
          overrideScore: proposal.proposedScore,
          overrideReason: `Accepted board proposal: ${proposal.rationale}`,
          overriddenAt: new Date(),
        },
      });
    }

    await transaction.auditEvent.create({
      data: {
        actorUserId,
        action:
          decision === "ACCEPTED"
            ? "BOARD_SCORE_PROPOSAL_ACCEPTED"
            : "BOARD_SCORE_PROPOSAL_DISMISSED",
        entityType: "BoardScoreProposal",
        entityId: proposal.id,
        reason: proposal.rationale,
        metadata: {
          dimensionKey: proposal.scoreDimension.key,
          priorEffectiveScore:
            proposal.scoreDimension.overrideScore ??
            proposal.scoreDimension.aiScore,
          proposedScore: proposal.proposedScore,
          researchRunId: proposal.scoreDimension.scorecard.researchRun.id,
        },
      },
    });
  });

  return {
    ideaId: proposal.scoreDimension.scorecard.researchRun.ideaId,
  };
}
