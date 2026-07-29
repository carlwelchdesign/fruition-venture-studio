import { validateContactSubmission } from "@/lib/contact";
import { sendEmail } from "@/lib/resend";
import { saveContactSubmission } from "@/lib/submissions";

const MAX_BODY_BYTES = 16_000;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === new URL(request.url).host;
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

  if (rawBody.length > MAX_BODY_BYTES) {
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
    saved = await saveContactSubmission(submission.data);
  } catch (error) {
    console.error("Contact persistence failed", {
      message: error instanceof Error ? error.message : "Unknown error",
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
