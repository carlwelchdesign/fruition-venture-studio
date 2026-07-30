import "server-only";

const globalForMagicLinks = globalThis as unknown as {
  fruitionMagicLinks?: Map<string, string>;
};

const links =
  globalForMagicLinks.fruitionMagicLinks ?? new Map<string, string>();

if (process.env.NODE_ENV !== "production") {
  globalForMagicLinks.fruitionMagicLinks = links;
}

export function storeDevelopmentMagicLink(email: string, url: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  links.set(email.toLowerCase(), url);
}

export function consumeDevelopmentMagicLink(email: string) {
  const key = email.toLowerCase();
  const url = links.get(key);
  links.delete(key);
  return url;
}
