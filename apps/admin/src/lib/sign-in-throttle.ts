import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@fruition/database";

const WINDOW_MS = 15 * 60 * 1000;
const RETENTION_MS = 48 * 60 * 60 * 1000;

function throttleHash(kind: "email" | "ip", value: string) {
  const secret =
    process.env.AUTH_RATE_LIMIT_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_RATE_LIMIT_SECRET must be at least 32 characters.");
  }

  return createHmac("sha256", secret)
    .update(`${kind}:${value}`)
    .digest("hex");
}

export function getClientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function allowAdminSignIn(email: string, address: string) {
  const emailHash = throttleHash("email", email || "invalid");
  const ipHash = throttleHash("ip", address);
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const retentionStart = new Date(Date.now() - RETENTION_MS);

  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`admin-email:${emailHash}`}, 0)
      )
    `;
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`admin-ip:${ipHash}`}, 0)
      )
    `;

    await transaction.securityThrottle.deleteMany({
      where: { createdAt: { lt: retentionStart } },
    });

    const [emailCount, ipCount] = await Promise.all([
      transaction.securityThrottle.count({
        where: {
          kind: "ADMIN_EMAIL",
          scopeHash: emailHash,
          createdAt: { gt: windowStart },
        },
      }),
      transaction.securityThrottle.count({
        where: {
          kind: "ADMIN_IP",
          scopeHash: ipHash,
          createdAt: { gt: windowStart },
        },
      }),
    ]);

    if (emailCount >= 5 || ipCount >= 20) {
      return false;
    }

    await transaction.securityThrottle.createMany({
      data: [
        { kind: "ADMIN_EMAIL", scopeHash: emailHash },
        { kind: "ADMIN_IP", scopeHash: ipHash },
      ],
    });
    return true;
  });
}
