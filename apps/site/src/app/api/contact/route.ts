import { validateContactSubmission } from "@fruition/contracts/contact";
import { sendEmail } from "@/lib/resend";
import {
  IntakeRateLimitError,
  saveContactSubmission,
} from "@/lib/submissions";

const MAX_BODY_BYTES = 256 * 1024;

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

  let saved: { ideaId: string; submitterId: string };
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
    console.error("Contact persistence failed", {
      category: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      {
        message:
          "Your note could not be saved. Please wait a moment and try again.",
      },
      { status: 503 },
    );
  }

  const to = process.env.CONTACT_TO_EMAIL;
  if (to) {
    const delivery = await sendEmail({
      to,
      replyTo: email,
      subject: `Fruition inquiry from ${name}`,
      text: [
        `Submission: ${saved.ideaId}`,
        `Name: ${name}`,
        `Email: ${email}`,
        `Organization: ${organization || "Not provided"}`,
        `Stage: ${projectStage}`,
        "",
        projectDetails,
      ].join("\n"),
    });

    if (!delivery.delivered && delivery.reason === "provider-error") {
      console.error("Contact notification failed", {
        status: delivery.status,
        ideaId: saved.ideaId,
      });
    }
  }

  return Response.json({
    submissionId: saved.ideaId,
    status: "received",
    message: "Thank you. Your note has been received, and we’ll be in touch.",
  });
}
