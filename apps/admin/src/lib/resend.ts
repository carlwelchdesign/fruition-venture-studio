import "server-only";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export async function sendEmail(message: EmailMessage) {
  const apiKey =
    process.env.ADMIN_RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  const from =
    process.env.ADMIN_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) {
    return { delivered: false as const, reason: "not-configured" as const };
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        reply_to: message.replyTo,
        subject: message.subject,
        text: message.text,
      }),
    });
  } catch {
    return {
      delivered: false as const,
      reason: "provider-error" as const,
      status: 0,
    };
  }

  if (!response.ok) {
    return {
      delivered: false as const,
      reason: "provider-error" as const,
      status: response.status,
    };
  }

  return { delivered: true as const };
}
