import { auth } from "@/lib/auth";
import { isAllowedAdminEmail } from "@/lib/admin-access";
import { consumeDevelopmentMagicLink } from "@/lib/development-magic-links";
import {
  allowAdminSignIn,
  getClientAddress,
} from "@/lib/sign-in-throttle";

const GENERIC_MESSAGE =
  "If that address is authorized, check your email for a secure sign-in link.";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const requestHost = request.headers.get("host");

    return [forwardedHost, requestHost, new URL(request.url).host]
      .filter(Boolean)
      .includes(originHost);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { message: "This request could not be verified." },
      { status: 403 },
    );
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });
  }

  const email =
    input && typeof input === "object" && "email" in input
      ? String(input.email).trim().toLowerCase()
      : "";

  const allowed = await allowAdminSignIn(email, getClientAddress(request));
  if (!allowed) {
    return Response.json(
      { message: "Please wait before requesting another sign-in link." },
      { status: 429 },
    );
  }

  if (!isAllowedAdminEmail(email)) {
    return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });
  }

  try {
    await auth.api.signInMagicLink({
      headers: request.headers,
      body: {
        email,
        name: "Fruition Admin",
        callbackURL: "/",
        errorCallbackURL: "/sign-in",
      },
    });
  } catch (error) {
    console.error("Admin sign-in failed", {
      category: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { message: GENERIC_MESSAGE },
      { status: 202 },
    );
  }

  return Response.json({
    message:
      process.env.NODE_ENV === "development"
        ? "Local sign-in link ready."
        : GENERIC_MESSAGE,
    developmentUrl:
      process.env.NODE_ENV === "development"
        ? consumeDevelopmentMagicLink(email)
        : undefined,
  }, { status: 202 });
}
