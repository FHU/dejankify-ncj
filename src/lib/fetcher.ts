const USER_AGENT =
  "Mozilla/5.0 (compatible; Dejankify/1.0; +https://dejankify.app)";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

export interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  redirectChain: string[];
}

export async function fetchPage(url: string): Promise<FetchResult> {
  let currentUrl = url;
  const redirectChain: string[] = [];

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle redirects manually so we can track the chain
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Redirect ${response.status} without Location header`);
        }
        redirectChain.push(currentUrl);
        // Resolve relative redirects
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        throw new Error(
          `Expected HTML but got ${contentType}. Make sure the URL points to a web page.`
        );
      }

      const html = await response.text();

      if (!html.trim()) {
        throw new Error("Page returned empty content.");
      }

      return {
        html,
        finalUrl: currentUrl,
        statusCode: response.status,
        contentType,
        redirectChain,
      };
    } catch (err) {
      clearTimeout(timeout);

      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(
          `Request timed out after ${TIMEOUT_MS / 1000}s. The page may be too slow to respond.`
        );
      }

      throw err;
    }
  }

  throw new Error(`Too many redirects (${MAX_REDIRECTS}). The page may be in a redirect loop.`);
}
