import { auth } from "@/lib/auth";
import { isAllowedAdminEmail } from "@/lib/admin-access";
import { consumeDevelopmentMagicLink } from "@/lib/development-magic-links";

export async function POST(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return Response.json({ message: "Enter a valid email." }, { status: 400 });
  }

  const email =
    input && typeof input === "object" && "email" in input
      ? String(input.email).trim().toLowerCase()
      : "";

  if (!isAllowedAdminEmail(email)) {
    return Response.json(
      { message: "That email is not authorized for Fruition admin." },
      { status: 403 },
    );
  }

  try {
    await auth.api.signInMagicLink({
      headers: request.headers,
      body: {
        email,
        name: "Fruition Admin",
        callbackURL: "/admin",
        errorCallbackURL: "/admin/sign-in",
      },
    });
  } catch (error) {
    console.error("Admin sign-in failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      { message: "The sign-in link could not be created." },
      { status: 500 },
    );
  }

  return Response.json({
    message:
      process.env.NODE_ENV === "development"
        ? "Local sign-in link ready."
        : "Check your email for a secure sign-in link.",
    developmentUrl:
      process.env.NODE_ENV === "development"
        ? consumeDevelopmentMagicLink(email)
        : undefined,
  });
}
