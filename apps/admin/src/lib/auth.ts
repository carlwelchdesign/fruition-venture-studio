import "server-only";

import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@fruition/database";
import { isAllowedAdminEmail } from "@/lib/admin-access";
import { storeDevelopmentMagicLink } from "@/lib/development-magic-links";
import { sendEmail } from "@/lib/resend";

const secret = process.env.BETTER_AUTH_SECRET;
const adminUrl =
  process.env.ADMIN_APP_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3001";

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is required.");
}

export const auth = betterAuth({
  appName: "Fruition Venture Studio",
  baseURL: adminUrl,
  trustedOrigins: [new URL(adminUrl).origin],
  secret,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  advanced: {
    cookiePrefix: "fruition-admin",
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        if (!isAllowedAdminEmail(email)) {
          throw new Error("This email is not authorized for Fruition admin.");
        }

        if (process.env.NODE_ENV === "development") {
          storeDevelopmentMagicLink(email, url);
        }

        const delivery = await sendEmail({
          to: email,
          subject: "Your Fruition admin sign-in link",
          text: [
            "Use this secure link to access the Fruition idea intelligence admin:",
            "",
            url,
            "",
            "This link expires in 15 minutes and can only be used once.",
          ].join("\n"),
        });

        if (
          process.env.NODE_ENV === "production" &&
          !delivery.delivered
        ) {
          throw new Error("Admin email delivery is not configured.");
        }
      },
    }),
    nextCookies(),
  ],
});
