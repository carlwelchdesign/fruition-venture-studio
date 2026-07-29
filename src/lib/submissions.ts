import "server-only";

import type { ContactSubmission } from "@/lib/contact";
import { prisma } from "@/lib/db";

export async function saveContactSubmission(submission: ContactSubmission) {
  return prisma.$transaction(async (transaction) => {
    const submitter = await transaction.submitter.upsert({
      where: { normalizedEmail: submission.email },
      create: {
        normalizedEmail: submission.email,
        email: submission.email,
        name: submission.name,
        organization: submission.organization || null,
      },
      update: {
        email: submission.email,
        name: submission.name,
        organization: submission.organization || undefined,
      },
    });

    const idea = await transaction.idea.create({
      data: {
        submitterId: submitter.id,
        nameSnapshot: submission.name,
        emailSnapshot: submission.email,
        organization: submission.organization || null,
        projectStage: submission.projectStage,
        projectDetails: submission.projectDetails,
        analysisConsent: true,
        consentedAt: new Date(),
      },
      select: { id: true },
    });

    return { ideaId: idea.id, submitterId: submitter.id };
  });
}
