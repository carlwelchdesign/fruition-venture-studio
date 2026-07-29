import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { saveContactSubmission } from "@/lib/submissions";

const testDomain = `fruition-test-${randomUUID()}.invalid`;
const createdEmails: string[] = [];

afterAll(async () => {
  await prisma.submitter.deleteMany({
    where: { normalizedEmail: { in: createdEmails } },
  });
  await prisma.$disconnect();
});

describe("saveContactSubmission", () => {
  it("groups multiple ideas under the same normalized email", async () => {
    const email = `founder@${testDomain}`;
    createdEmails.push(email);
    const base = {
      name: "Test Founder",
      email,
      organization: "",
      projectStage: "idea" as const,
      projectDetails:
        "A sufficiently detailed first opportunity for deterministic grouping.",
      analysisConsent: true as const,
    };

    const first = await saveContactSubmission(base);
    const second = await saveContactSubmission({
      ...base,
      projectDetails:
        "A separate second opportunity submitted by the same person over time.",
    });

    expect(second.submitterId).toBe(first.submitterId);
    expect(second.ideaId).not.toBe(first.ideaId);

    const profile = await prisma.submitter.findUniqueOrThrow({
      where: { normalizedEmail: email },
      include: { ideas: true },
    });
    expect(profile.ideas).toHaveLength(2);
  });

  it("keeps a different email on a separate profile", async () => {
    const email = `other@${testDomain}`;
    createdEmails.push(email);

    const saved = await saveContactSubmission({
      name: "Other Founder",
      email,
      organization: "Other Venture",
      projectStage: "prototype",
      projectDetails:
        "A separate opportunity that must remain on a different submitter profile.",
      analysisConsent: true,
    });

    const profile = await prisma.submitter.findUniqueOrThrow({
      where: { normalizedEmail: email },
    });
    expect(profile.id).toBe(saved.submitterId);
  });
});
