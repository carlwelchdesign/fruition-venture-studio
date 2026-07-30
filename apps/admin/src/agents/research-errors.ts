function messageFromObject(
  value: Record<string, unknown>,
  depth: number,
): string | null {
  for (const key of ["message", "detail", "error_description"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (depth >= 2) {
    return null;
  }

  for (const key of ["error", "cause"]) {
    const candidate = value[key];
    if (candidate && typeof candidate === "object") {
      const message = messageFromObject(
        candidate as Record<string, unknown>,
        depth + 1,
      );
      if (message) {
        return message;
      }
    }
  }

  const code =
    typeof value.code === "string" && value.code.trim()
      ? value.code.trim()
      : null;
  const status =
    typeof value.status === "number" || typeof value.status === "string"
      ? String(value.status)
      : null;

  if (code && status) {
    return `Research provider error ${status}: ${code}`;
  }
  if (code) {
    return `Research provider error: ${code}`;
  }
  if (status) {
    return `Research provider returned status ${status}.`;
  }

  return null;
}

export function describeResearchError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const message = messageFromObject(error as Record<string, unknown>, 0);
    if (message) {
      return message;
    }
  }

  return "Unknown research failure";
}
