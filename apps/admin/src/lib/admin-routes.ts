export const adminSignInEndpoint = "/api/admin/sign-in";

export function submitterExportEndpoint(submitterId: string) {
  return `/api/admin/submitters/${encodeURIComponent(submitterId)}/export`;
}
