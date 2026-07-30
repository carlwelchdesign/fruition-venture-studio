import type {
  IdeaResearchContext,
} from "@/agents/research-team";
import { describeResearchError } from "@/agents/research-errors";
import { specialistDefinitions } from "@/agents/research-config";
import { buildScorecard } from "@/agents/scorecard";
import type { SpecialistReport } from "@/agents/research-schemas";
import { prisma } from "@fruition/database";

type CompletedSpecialist = {
  role: (typeof specialistDefinitions)[number]["role"];
  report: SpecialistReport;
};

async function loadResearchContext(researchRunId: string) {
  "use step";

  const run = await prisma.researchRun.update({
    where: { id: researchRunId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      errorMessage: null,
      idea: { update: { status: "RESEARCHING" } },
    },
    include: { idea: true },
  });

  return {
    ideaId: run.idea.id,
    projectStage: run.idea.projectStage,
    projectDetails: run.idea.projectDetails,
    organization: run.idea.organization,
  } satisfies IdeaResearchContext;
}

async function runSpecialistStep(
  definition: (typeof specialistDefinitions)[number],
  context: IdeaResearchContext,
): Promise<CompletedSpecialist> {
  "use step";

  const { runSpecialist } = await import("@/agents/research-team");
  return {
    role: definition.role,
    report: await runSpecialist(definition, context),
  };
}

async function persistSpecialistReports(
  researchRunId: string,
  completed: CompletedSpecialist[],
) {
  "use step";

  await prisma.$transaction(
    completed.map(({ role, report }) =>
      prisma.agentReport.upsert({
        where: {
          researchRunId_role: {
            researchRunId,
            role,
          },
        },
        create: {
          researchRunId,
          role,
          title: report.title,
          summary: report.summary,
          findings: report.findings,
          risks: report.risks,
          openQuestions: report.openQuestions,
          confidence: report.confidence,
          sources: {
            create: report.sources.map((source) => ({
              url: source.url,
              title: source.title,
              snippet: source.snippet,
              publishedAt: source.publishedAt
                ? new Date(source.publishedAt)
                : null,
            })),
          },
        },
        update: {
          title: report.title,
          summary: report.summary,
          findings: report.findings,
          risks: report.risks,
          openQuestions: report.openQuestions,
          confidence: report.confidence,
          sources: {
            deleteMany: {},
            create: report.sources.map((source) => ({
              url: source.url,
              title: source.title,
              snippet: source.snippet,
              publishedAt: source.publishedAt
                ? new Date(source.publishedAt)
                : null,
            })),
          },
        },
      }),
    ),
  );
}

async function runSynthesisStep(
  context: IdeaResearchContext,
  completed: CompletedSpecialist[],
) {
  "use step";
  const { runSynthesis } = await import("@/agents/research-team");
  return runSynthesis(context, completed);
}

async function persistSynthesis(
  researchRunId: string,
  synthesis: import("@/agents/research-schemas").ResearchSynthesis,
) {
  "use step";

  const scorecard = buildScorecard(synthesis);

  await prisma.$transaction(async (transaction) => {
    await transaction.scorecard.upsert({
      where: { researchRunId },
      create: {
        researchRunId,
        totalScore: scorecard.totalScore,
        recommendation: scorecard.recommendation,
        confidence: scorecard.confidence,
        summary: scorecard.summary,
        nextSteps: scorecard.nextSteps,
        dimensions: {
          create: scorecard.dimensions.map((dimension) => ({
            key: dimension.key,
            label: dimension.label,
            weight: dimension.weight,
            aiScore: dimension.aiScore,
            aiRationale: dimension.aiRationale,
            confidence: dimension.confidence,
            evidence: dimension.evidence,
          })),
        },
      },
      update: {
        totalScore: scorecard.totalScore,
        recommendation: scorecard.recommendation,
        confidence: scorecard.confidence,
        summary: scorecard.summary,
        nextSteps: scorecard.nextSteps,
        dimensions: {
          deleteMany: {},
          create: scorecard.dimensions.map((dimension) => ({
            key: dimension.key,
            label: dimension.label,
            weight: dimension.weight,
            aiScore: dimension.aiScore,
            aiRationale: dimension.aiRationale,
            confidence: dimension.confidence,
            evidence: dimension.evidence,
          })),
        },
      },
    });

    await transaction.researchRun.update({
      where: { id: researchRunId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        idea: { update: { status: "REVIEW_REQUIRED" } },
      },
    });
  });
}

async function markResearchFailed(researchRunId: string, message: string) {
  "use step";

  await prisma.researchRun.update({
    where: { id: researchRunId },
    data: {
      status: "FAILED",
      errorMessage: message.slice(0, 1000),
      completedAt: new Date(),
      idea: { update: { status: "RESEARCH_FAILED" } },
    },
  });
}

export async function researchIdeaWorkflow(researchRunId: string) {
  "use workflow";

  try {
    const context = await loadResearchContext(researchRunId);
    const completed = await Promise.all(
      specialistDefinitions.map((definition) =>
        runSpecialistStep(definition, context),
      ),
    );
    await persistSpecialistReports(researchRunId, completed);
    const synthesis = await runSynthesisStep(context, completed);
    await persistSynthesis(researchRunId, synthesis);
  } catch (error) {
    const message = describeResearchError(error);
    await markResearchFailed(researchRunId, message);
    throw error;
  }
}
