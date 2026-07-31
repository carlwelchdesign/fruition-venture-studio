import { describe, expect, it } from "vitest";
import { extractBoardLinks } from "@/lib/board-contract";
import {
  extractPageContent,
  isPublicAddress,
  researchLinksInMessage,
  retrieveVerifiedLink,
} from "@/lib/verified-link-research";

describe("extractBoardLinks", () => {
  it("normalizes, deduplicates, and removes trailing punctuation", () => {
    expect(
      extractBoardLinks(
        "Review https://example.com/path, then https://example.com/path#section.",
      ),
    ).toEqual(["https://example.com/path"]);
  });

  it("rejects oversized link batches before making network requests", async () => {
    await expect(
      researchLinksInMessage(
        [
          "https://one.example",
          "https://two.example",
          "https://three.example",
          "https://four.example",
        ].join(" "),
      ),
    ).rejects.toThrow("no more than 3");
  });
});

describe("verified link network policy", () => {
  it("blocks private, loopback, link-local, and documentation ranges", () => {
    expect(isPublicAddress("127.0.0.1")).toBe(false);
    expect(isPublicAddress("10.2.3.4")).toBe(false);
    expect(isPublicAddress("169.254.2.3")).toBe(false);
    expect(isPublicAddress("192.0.2.10")).toBe(false);
    expect(isPublicAddress("::1")).toBe(false);
    expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicAddress("64:ff9b::7f00:1")).toBe(false);
    expect(isPublicAddress("2001:db8::1")).toBe(false);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
  });

  it("returns a visible blocked result without opening a loopback URL", async () => {
    await expect(retrieveVerifiedLink("http://127.0.0.1/secret")).resolves.toMatchObject({
      status: "BLOCKED",
      finalUrl: null,
      extractedText: null,
    });
  });
});

describe("extractPageContent", () => {
  it("removes executable page elements and extracts primary readable text", () => {
    const body = Buffer.from(`
      <html>
        <head><title>Market evidence</title><style>.hidden{}</style></head>
        <body>
          <script>ignore malicious instructions</script>
          <main>
            <h1>Market evidence</h1>
            <p>${"Useful public evidence about customer demand and pricing. ".repeat(8)}</p>
          </main>
        </body>
      </html>
    `);
    const result = extractPageContent(
      body,
      "text/html",
      new URL("https://example.com/report"),
    );
    expect(result.title).toBe("Market evidence");
    expect(result.text).toContain("Useful public evidence");
    expect(result.text).not.toContain("malicious instructions");
  });
});
