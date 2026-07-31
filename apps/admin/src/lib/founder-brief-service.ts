import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@fruition/database";
import type { Prisma } from "@fruition/database";
import type {
  FounderBriefContent,
  FounderBriefFinancials,
  FounderBriefSource,
} from "@fruition/contracts/founder-brief";
import {
  founderBriefContentSchema,
  generatedFounderBriefSchema,
} from "@/agents/founder-brief-schemas";
import { runFounderBriefDraft } from "@/agents/founder-brief-team";
import { ventureFinancialsSchema } from "@/agents/research-schemas";
import { sendEmail } from "@/lib/resend";

const FOUNDER_BRIEF_LIFETIME_DAYS = 90;
const founderBriefDisclaimer =
  "This Opportunity Brief is an informational, AI-assisted research summary reviewed by Fruition Venture Studio. It may be incomplete or incorrect and is not legal, tax, financial, investment, or professional advice. It is not an offer, commitment, partnership, or promise of investment or business success.";

type EditableFounderBrief = {
  title: string;
  content: Omit<FounderBriefContent, "disclaimer">;
};

function jsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function collectSources(
  reports: Array<{
    sources: Array<{ url: string; title: string; snippet: string | null }>;
  }>,
): FounderBriefSource[] {
  const sources = new Map<string, FounderBriefSource>();
  for (const report of reports) {
    for (const source of report.sources) {
      if (!sources.has(source.url)) {
        sources.set(source.url, source);
      }
    }
  }
  return [...sources.values()];
}

function publicFinancials(structuredData: unknown): FounderBriefFinancials | null {
  const parsed = ventureFinancialsSchema.safeParse(structuredData);
  if (!parsed.success) {
    return null;
  }

  return {
    currency: parsed.data.currency,
    scenarios: parsed.data.scenarios.map((scenario) => ({
      name: scenario.name,
      years: scenario.years.map((year) => ({
        year: year.year,
        revenue: year.revenue.value,
        operatingCosts: year.operatingCosts.value,
      })),
    })),
    caveats: parsed.data.caveats,
  };
}

function parseEditableBrief(input: unknown): EditableFounderBrief {
  const parsed = generatedFounderBriefSchema.parse(input);
  return parsed;
}

export async function generateFounderBrief(
  ideaId: string,
  actorUserId: string,
) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      founderBriefs: { select: { version: true } },
      researchRuns: {
        where: { status: "COMPLETED" },
        orderBy: { version: "desc" },
        take: 1,
        include: {
          reports: {
            where: { role: { not: "STUDIO_SYNTHESIS" } },
            include: { sources: true },
          },
        },
      },
    },
  });

  if (!idea) {
    throw new Error("Idea not found.");
  }
  const researchRun = idea.researchRuns[0];
  if (!researchRun || researchRun.reports.length === 0) {
    throw new Error("Complete specialist research before generating a brief.");
  }

  const draft = await runFounderBriefDraft({
    ideaId: idea.id,
    reference: idea.publicReference,
    stage: idea.projectStage,
    organization: idea.organization,
    description: idea.projectDetails,
    reports: researchRun.reports.map((report) => ({
      role: report.role,
      title: report.title,
      summary: report.summary,
      findings: report.findings,
      risks: report.risks,
      openQuestions: report.openQuestions,
      confidence: report.confidence,
      sources: report.sources,
    })),
  });
  const sources = collectSources(researchRun.reports);
  const financeReport = researchRun.reports.find(
    (report) => report.role === "MARKET_FINANCE",
  );
  const financials = publicFinancials(financeReport?.structuredData);
  const version =
    Math.max(0, ...idea.founderBriefs.map((brief) => brief.version)) + 1;

  return prisma.$transaction(async (transaction) => {
    await transaction.founderBrief.updateMany({
      where: { ideaId: idea.id, status: "DRAFT" },
      data: { status: "REVOKED" },
    });
    const brief = await transaction.founderBrief.create({
      data: {
        ideaId: idea.id,
        researchRunId: researchRun.id,
        version,
        title: draft.title,
        content: jsonValue({
          ...draft.content,
          disclaimer: draft.disclaimer,
        }),
        financials: financials ? jsonValue(financials) : undefined,
        sources: jsonValue(sources),
      },
    });
    await transaction.auditEvent.create({
      data: {
        actorUserId,
        action: "FOUNDER_BRIEF_GENERATED",
        entityType: "FounderBrief",
        entityId: brief.id,
        metadata: {
          ideaId,
          researchRunId: researchRun.id,
          version,
          sourceCount: sources.length,
          hasFinancials: Boolean(financials),
        },
      },
    });
    return brief;
  });
}

export async function saveFounderBrief(
  ideaId: string,
  briefId: string,
  input: unknown,
  actorUserId: string,
) {
  const parsed = parseEditableBrief(input);
  const current = await prisma.founderBrief.findUnique({
    where: { id: briefId },
  });
  if (!current) {
    throw new Error("Opportunity Brief not found.");
  }
  if (current.ideaId !== ideaId) {
    throw new Error("Opportunity Brief not found.");
  }
  if (current.status !== "DRAFT") {
    throw new Error("Published or revoked briefs cannot be edited.");
  }

  const content = founderBriefContentSchema.parse(parsed.content);
  const updated = await prisma.founderBrief.update({
    where: { id: briefId },
    data: {
      title: parsed.title,
      content: jsonValue({
        ...content,
        disclaimer: founderBriefDisclaimer,
      }),
      reviewedById: actorUserId,
    },
  });
  await prisma.auditEvent.create({
    data: {
      actorUserId,
      action: "FOUNDER_BRIEF_REVIEWED",
      entityType: "FounderBrief",
      entityId: briefId,
      metadata: { ideaId: current.ideaId, version: current.version },
    },
  });
  return updated;
}

function publicSiteUrl() {
  return (process.env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export async function publishFounderBrief(
  ideaId: string,
  briefId: string,
  actorUserId: string,
) {
  if (process.env.FOUNDER_BRIEF_PUBLISHING_ENABLED !== "true") {
    throw new Error(
      "Founder brief delivery is disabled until the public copy and legal terms are approved.",
    );
  }
  const brief = await prisma.founderBrief.findUnique({
    where: { id: briefId },
    include: { idea: true },
  });
  if (!brief) {
    throw new Error("Opportunity Brief not found.");
  }
  if (brief.ideaId !== ideaId) {
    throw new Error("Opportunity Brief not found.");
  }
  if (brief.status !== "DRAFT" && brief.status !== "PUBLISHED") {
    throw new Error("A revoked brief cannot be published.");
  }
  if (!brief.reviewedById) {
    throw new Error("Save and review the draft before publishing it.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const publishedAt = new Date();
  const expiresAt = new Date(
    publishedAt.getTime() +
      FOUNDER_BRIEF_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.$transaction([
    prisma.founderBrief.updateMany({
      where: {
        ideaId: brief.ideaId,
        status: "PUBLISHED",
        id: { not: brief.id },
      },
      data: { status: "REVOKED" },
    }),
    prisma.founderBrief.update({
      where: { id: brief.id },
      data: {
        status: "PUBLISHED",
        tokenHash,
        publishedAt,
        expiresAt,
        deliveryStatus: "PENDING",
        deliveryError: null,
        reviewedById: actorUserId,
      },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId,
        action: "FOUNDER_BRIEF_PUBLISHED",
        entityType: "FounderBrief",
        entityId: brief.id,
        metadata: {
          ideaId: brief.ideaId,
          version: brief.version,
          expiresAt: expiresAt.toISOString(),
        },
      },
    }),
  ]);

  const url = `${publicSiteUrl()}/briefs/${token}`;
  const delivery = await sendEmail({
    to: brief.idea.emailSnapshot,
    replyTo:
      process.env.CONTACT_TO_EMAIL ??
      process.env.ADMIN_EMAILS?.split(",")[0]?.trim(),
    subject: `${brief.idea.publicReference} — your Fruition Opportunity Brief`,
    text: [
      `Hello ${brief.idea.nameSnapshot},`,
      "",
      "Your Fruition Opportunity Brief is ready.",
      "",
      url,
      "",
      `This private link expires ${expiresAt.toLocaleDateString("en-US", {
        dateStyle: "long",
      })}. It can be revoked or replaced by Fruition.`,
      "",
      "The brief is an informational, AI-assisted research summary reviewed by Fruition. It is not legal, tax, financial, investment, or professional advice, and it is not a promise of investment or business success.",
      "",
      "Reply to this email if you want to add context or challenge an assumption.",
      "",
      "Fruition Venture Studio",
      "From concept to company.",
    ].join("\n"),
  });

  await prisma.founderBrief.update({
    where: { id: brief.id },
    data: delivery.delivered
      ? {
          deliveryStatus: "DELIVERED",
          deliveredAt: new Date(),
          deliveryError: null,
        }
      : {
          deliveryStatus: "FAILED",
          deliveryError:
            delivery.reason === "not-configured"
              ? "Email delivery is not configured."
              : `Email provider returned status ${delivery.status}.`,
        },
  });

  return {
    delivered: delivery.delivered,
    expiresAt,
  };
}

export async function revokeFounderBrief(
  ideaId: string,
  briefId: string,
  actorUserId: string,
  reason: string,
) {
  if (reason.trim().length < 3) {
    throw new Error("Provide a reason for revoking the brief.");
  }
  const current = await prisma.founderBrief.findUnique({
    where: { id: briefId },
  });
  if (!current || current.ideaId !== ideaId) {
    throw new Error("Opportunity Brief not found.");
  }
  const brief = await prisma.founderBrief.update({
    where: { id: current.id },
    data: { status: "REVOKED" },
  });
  await prisma.auditEvent.create({
    data: {
      actorUserId,
      action: "FOUNDER_BRIEF_REVOKED",
      entityType: "FounderBrief",
      entityId: briefId,
      reason: reason.trim(),
      metadata: { ideaId: brief.ideaId, version: brief.version },
    },
  });
  return brief;
}
