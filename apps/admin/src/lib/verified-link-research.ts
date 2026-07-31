import "server-only";

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { load } from "cheerio";
import {
  extractBoardLinks,
  maxBoardLinksPerMessage,
  type BoardVerifiedSourceStatus,
} from "@/lib/board-contract";

const maxDocumentBytes = 2 * 1024 * 1024;
const maxExtractedCharacters = 50_000;
const maxRedirects = 4;
const requestTimeoutMs = 12_000;

const blockedAddresses = new BlockList();
blockedAddresses.addSubnet("0.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("10.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("100.64.0.0", 10, "ipv4");
blockedAddresses.addSubnet("127.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("169.254.0.0", 16, "ipv4");
blockedAddresses.addSubnet("172.16.0.0", 12, "ipv4");
blockedAddresses.addSubnet("192.0.0.0", 24, "ipv4");
blockedAddresses.addSubnet("192.0.2.0", 24, "ipv4");
blockedAddresses.addSubnet("192.88.99.0", 24, "ipv4");
blockedAddresses.addSubnet("192.168.0.0", 16, "ipv4");
blockedAddresses.addSubnet("198.18.0.0", 15, "ipv4");
blockedAddresses.addSubnet("198.51.100.0", 24, "ipv4");
blockedAddresses.addSubnet("203.0.113.0", 24, "ipv4");
blockedAddresses.addSubnet("224.0.0.0", 4, "ipv4");
blockedAddresses.addSubnet("240.0.0.0", 4, "ipv4");
blockedAddresses.addAddress("::", "ipv6");
blockedAddresses.addAddress("::1", "ipv6");
blockedAddresses.addSubnet("64:ff9b::", 96, "ipv6");
blockedAddresses.addSubnet("fc00::", 7, "ipv6");
blockedAddresses.addSubnet("fe80::", 10, "ipv6");
blockedAddresses.addSubnet("ff00::", 8, "ipv6");
blockedAddresses.addSubnet("2001:db8::", 32, "ipv6");
blockedAddresses.addSubnet("2002::", 16, "ipv6");

type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

type RetrievedDocument = {
  finalUrl: URL;
  body: Buffer;
  mimeType: string;
};

export type VerifiedLinkResearchResult = {
  originalUrl: string;
  finalUrl: string | null;
  title: string | null;
  status: BoardVerifiedSourceStatus;
  statusDetail: string | null;
  mimeType: string | null;
  contentHash: string | null;
  extractedText: string | null;
  retrievedAt: Date | null;
};

class LinkRetrievalError extends Error {
  constructor(
    readonly status: Exclude<BoardVerifiedSourceStatus, "VERIFIED">,
    message: string,
  ) {
    super(message);
    this.name = "LinkRetrievalError";
  }
}

function normalizedHostname(url: URL) {
  return url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

export function isPublicAddress(address: string, family = isIP(address)) {
  if (family !== 4 && family !== 6) {
    return false;
  }
  if (family === 6 && address.toLowerCase().startsWith("::ffff:")) {
    const mapped = address.slice(7);
    if (isIP(mapped) === 4) {
      return isPublicAddress(mapped, 4);
    }
    const [highText, lowText] = mapped.split(":");
    const high = Number.parseInt(highText, 16);
    const low = Number.parseInt(lowText, 16);
    if (
      Number.isInteger(high) &&
      Number.isInteger(low) &&
      high >= 0 &&
      high <= 0xffff &&
      low >= 0 &&
      low <= 0xffff
    ) {
      return isPublicAddress(
        `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`,
        4,
      );
    }
    return false;
  }
  return !blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6");
}

function validateUrlShape(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new LinkRetrievalError(
      "UNSUPPORTED",
      "Only public HTTP and HTTPS links can be analyzed.",
    );
  }
  if (url.username || url.password) {
    throw new LinkRetrievalError(
      "BLOCKED",
      "Links containing embedded credentials are not opened.",
    );
  }
  if (
    (url.protocol === "http:" && url.port && url.port !== "80") ||
    (url.protocol === "https:" && url.port && url.port !== "443")
  ) {
    throw new LinkRetrievalError(
      "BLOCKED",
      "Links using non-standard network ports are not opened.",
    );
  }
  const hostname = normalizedHostname(url);
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new LinkRetrievalError(
      "BLOCKED",
      "Private or local network links are not opened.",
    );
  }
}

async function resolvePublicAddress(url: URL): Promise<ResolvedAddress> {
  validateUrlShape(url);
  const hostname = normalizedHostname(url);
  const literalFamily = isIP(hostname);
  const addresses: ResolvedAddress[] =
    literalFamily === 4 || literalFamily === 6
      ? [{ address: hostname, family: literalFamily }]
      : (await lookup(hostname, { all: true, verbatim: true })).map(
          ({ address, family }) => ({
            address,
            family: family as 4 | 6,
          }),
        );

  if (addresses.length === 0) {
    throw new LinkRetrievalError(
      "UNAVAILABLE",
      "The link’s host could not be resolved.",
    );
  }
  if (addresses.some(({ address, family }) => !isPublicAddress(address, family))) {
    throw new LinkRetrievalError(
      "BLOCKED",
      "The link resolves to a private or reserved network address.",
    );
  }
  return addresses[0];
}

async function requestDocument(
  url: URL,
  redirectCount = 0,
): Promise<RetrievedDocument> {
  if (redirectCount > maxRedirects) {
    throw new LinkRetrievalError(
      "UNAVAILABLE",
      "The page redirected too many times.",
    );
  }
  const resolved = await resolvePublicAddress(url);
  const transport = url.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise<RetrievedDocument>((resolve, reject) => {
    const request = transport(
      url,
      {
        headers: {
          Accept: "text/html,text/plain;q=0.9,application/pdf;q=0.4",
          "Accept-Encoding": "identity",
          "User-Agent":
            "FruitionVentureStudio/1.0 (+https://fruition-venture-studio.vercel.app)",
        },
        lookup: (_hostname, options, callback) => {
          if (typeof options === "object" && options.all) {
            callback(null, [resolved]);
            return;
          }
          callback(null, resolved.address, resolved.family);
        },
      },
      async (response) => {
        const statusCode = response.statusCode ?? 0;
        const location = response.headers.location;
        if (
          location &&
          [301, 302, 303, 307, 308].includes(statusCode)
        ) {
          response.resume();
          try {
            resolve(
              await requestDocument(
                new URL(location, url),
                redirectCount + 1,
              ),
            );
          } catch (error) {
            reject(error);
          }
          return;
        }
        if (statusCode === 401 || statusCode === 403) {
          response.resume();
          reject(
            new LinkRetrievalError(
              "BLOCKED",
              "The page requires authorization or denied automated access.",
            ),
          );
          return;
        }
        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(
            new LinkRetrievalError(
              "UNAVAILABLE",
              `The page returned HTTP ${statusCode || "error"}.`,
            ),
          );
          return;
        }

        const declaredLength = Number(response.headers["content-length"] ?? 0);
        if (declaredLength > maxDocumentBytes) {
          response.resume();
          reject(
            new LinkRetrievalError(
              "UNSUPPORTED",
              "The page is too large to analyze safely.",
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;
        try {
          for await (const chunk of response) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            totalBytes += buffer.byteLength;
            if (totalBytes > maxDocumentBytes) {
              throw new LinkRetrievalError(
                "UNSUPPORTED",
                "The page is too large to analyze safely.",
              );
            }
            chunks.push(buffer);
          }
          resolve({
            finalUrl: url,
            body: Buffer.concat(chunks),
            mimeType: String(response.headers["content-type"] ?? "")
              .split(";")[0]
              .trim()
              .toLowerCase(),
          });
        } catch (error) {
          reject(error);
        }
      },
    );

    request.setTimeout(requestTimeoutMs, () => {
      request.destroy(
        new LinkRetrievalError(
          "UNAVAILABLE",
          "The page did not respond before the retrieval timeout.",
        ),
      );
    });
    request.on("error", reject);
    request.end();
  });
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function extractPageContent(
  body: Buffer,
  mimeType: string,
  url: URL,
) {
  if (mimeType === "text/plain") {
    const text = cleanText(body.toString("utf8")).slice(
      0,
      maxExtractedCharacters,
    );
    return { title: url.hostname, text };
  }
  if (mimeType !== "text/html" && mimeType !== "application/xhtml+xml") {
    throw new LinkRetrievalError(
      "UNSUPPORTED",
      mimeType === "application/pdf"
        ? "PDF extraction is not available yet. Paste the relevant text into the board message."
        : "This file type cannot be analyzed safely.",
    );
  }

  const $ = load(body.toString("utf8"));
  $("script, style, noscript, template, svg, canvas, iframe").remove();
  const title =
    cleanText($('meta[property="og:title"]').attr("content") ?? "") ||
    cleanText($("title").first().text()) ||
    cleanText($("h1").first().text()) ||
    url.hostname;
  const primary = $("main").first().text() || $("article").first().text();
  const text = cleanText(primary.length >= 200 ? primary : $("body").text()).slice(
    0,
    maxExtractedCharacters,
  );
  if (text.length < 80) {
    throw new LinkRetrievalError(
      "UNSUPPORTED",
      "The page did not contain enough readable text to analyze.",
    );
  }
  return { title: title.slice(0, 300), text };
}

export async function retrieveVerifiedLink(
  originalUrl: string,
): Promise<VerifiedLinkResearchResult> {
  try {
    const requestedUrl = new URL(originalUrl);
    const document = await requestDocument(requestedUrl);
    const { title, text } = extractPageContent(
      document.body,
      document.mimeType,
      document.finalUrl,
    );
    return {
      originalUrl,
      finalUrl: document.finalUrl.toString(),
      title,
      status: "VERIFIED",
      statusDetail: "Opened and analyzed from the public page.",
      mimeType: document.mimeType,
      contentHash: createHash("sha256").update(text).digest("hex"),
      extractedText: text,
      retrievedAt: new Date(),
    };
  } catch (error) {
    const known =
      error instanceof LinkRetrievalError
        ? error
        : new LinkRetrievalError(
            "UNAVAILABLE",
            "The page could not be retrieved.",
          );
    return {
      originalUrl,
      finalUrl: null,
      title: null,
      status: known.status,
      statusDetail: known.message,
      mimeType: null,
      contentHash: null,
      extractedText: null,
      retrievedAt: null,
    };
  }
}

export async function researchLinksInMessage(message: string) {
  const links = extractBoardLinks(message);
  if (links.length > maxBoardLinksPerMessage) {
    throw new Error(
      `Add no more than ${maxBoardLinksPerMessage} public links per board message.`,
    );
  }
  return Promise.all(links.map(retrieveVerifiedLink));
}
