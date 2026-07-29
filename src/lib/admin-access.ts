import "server-only";

const DEVELOPMENT_ADMIN_EMAIL = "local@fruition.studio";

export function getAllowedAdminEmails() {
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  return process.env.NODE_ENV === "development"
    ? [DEVELOPMENT_ADMIN_EMAIL]
    : [];
}

export function isAllowedAdminEmail(email: string) {
  return getAllowedAdminEmails().includes(email.trim().toLowerCase());
}

export function getDefaultAdminEmail() {
  return getAllowedAdminEmails()[0] ?? "";
}
