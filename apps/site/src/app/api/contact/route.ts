import { validateContactSubmission } from "@fruition/contracts/contact";
import { sendEmail } from "@/lib/resend";
import {
  IntakeRateLimitError,
  saveContactSubmission,
} from "@/lib/submissions";

const MAX_BODY_BYTES = 256 * 1024;

function persistenceDiagnostic(error: unknown) {
  const fallback = {
    category: error instanceof Error ? error.name : "UnknownError",
  };
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const candidate = error as Record<string, unknown>;
  const diagnostic: Record<string, string> = { ...fallback };
  for (const field of [
    "code",
    "severity",
    "routine",
    "constraint",
    "table",
    "column",
  ] as const) {
    if (typeof candidate[field] === "string") {
      diagnostic[field] = candidate[field];
    }
  }
  return diagnostic;
}

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
      { message: "This submission could not be verified." },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json(
      { message: "This submission is too large." },
      { status: 413 },
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json(
      { message: "Please complete the form and try again." },
      { status: 400 },
    );
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return Response.json(
      { message: "This submission is too large." },
      { status: 413 },
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { message: "Please complete the form and try again." },
      { status: 400 },
    );
  }

  const submission = validateContactSubmission(input);
  if (!submission.success) {
    return Response.json(
      { message: submission.message },
      { status: 400 },
    );
  }

  const { name, email, organization, projectStage, projectDetails } =
    submission.data;

  let saved: {
    ideaId: string;
    submitterId: string;
    publicReference: string;
  };
  try {
    const clientAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    saved = await saveContactSubmission(submission.data, clientAddress);
  } catch (error) {
    if (error instanceof IntakeRateLimitError) {
      return Response.json(
        {
          message:
            "We have received several recent submissions. Please wait before trying again.",
        },
        { status: 429 },
      );
    }
    console.error(
      JSON.stringify({
        level: "error",
        event: "contact_persistence_failed",
        requestId: request.headers.get("x-vercel-id"),
        ...persistenceDiagnostic(error),
      }),
    );
    return Response.json(
      {
        message:
          "Your note could not be saved. Please wait a moment and try again.",
      },
      { status: 503 },
    );
  }

  const to = process.env.CONTACT_TO_EMAIL;
  const [ownerDelivery, founderDelivery] = await Promise.all([
    to
      ? sendEmail({
          to,
          replyTo: email,
          subject: `Fruition inquiry from ${name}`,
          text: [
            `Reference: ${saved.publicReference}`,
            `Submission: ${saved.ideaId}`,
            `Name: ${name}`,
            `Email: ${email}`,
            `Organization: ${organization || "Not provided"}`,
            `Stage: ${projectStage}`,
            "",
            projectDetails,
          ].join("\n"),
        })
      : Promise.resolve({
          delivered: false as const,
          reason: "not-configured" as const,
        }),
    sendEmail({
      to: email,
      replyTo: to,
      subject: `${saved.publicReference} — Fruition received your idea`,
      text: [
        `Hello ${name},`,
        "",
        "Your idea is in.",
        "",
        `Reference: ${saved.publicReference}`,
        "",
        "What happens next",
        "1. Fruition reviews the opportunity for clarity and studio fit.",
        "2. Selected ideas may move into AI-assisted, public-source research and human review.",
        "3. If your idea is selected, you may receive a private Fruition Opportunity Brief by email.",
        "",
        "Not every submission receives a brief, and this receipt does not promise a response or investment. You can reply to this email if you need to add important context.",
        "",
        "Please do not send confidential or proprietary information by email.",
        "",
        "Fruition Venture Studio",
        "From concept to company.",
      ].join("\n"),
    }),
  ]);

  if (!ownerDelivery.delivered && ownerDelivery.reason === "provider-error") {
    console.error("Contact notification failed", {
      status: ownerDelivery.status,
      ideaId: saved.ideaId,
    });
  }
  if (!founderDelivery.delivered && founderDelivery.reason === "provider-error") {
    console.error("Founder receipt failed", {
      status: founderDelivery.status,
      ideaId: saved.ideaId,
    });
  }

  return Response.json({
    submissionId: saved.ideaId,
    reference: saved.publicReference,
    status: "received",
    message: "Your idea is in.",
    confirmationEmail: founderDelivery.delivered ? "sent" : "unavailable",
  });
}
