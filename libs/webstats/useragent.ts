/** Coarse user-agent classification and bot detection.
 *
 *  Hand-rolled rather than pulled from a library on purpose. The dashboard
 *  only ever shows buckets — Chrome/Safari/Firefox/Edge, iOS/Android/Windows/
 *  macOS/Linux, mobile/tablet/desktop — so the precision a full parser buys is
 *  precision nothing renders. The alternative, `ua-parser-js`, moved to an
 *  AGPL/commercial licence in v2, which is a poor fit for a product we sell.
 *
 *  Deliberately conservative: an agent we do not recognise records `null`
 *  rather than a guess, because a wrong bucket is worse than an honest gap. */

export type DeviceType = "desktop" | "mobile" | "tablet";

export type UserAgentInfo = {
  browser: string | null;
  os: string | null;
  device: DeviceType;
};

/** Substrings that appear in automated agents but not in real browsers.
 *
 *  Two families: self-identifying crawlers (`bot`, `spider`, `crawler`, named
 *  AI fetchers) and HTTP clients (`curl`, `python-requests`, `axios`). The
 *  `bot` catch-all is why `Slackbot` and `GPTBot` need no entry of their own. */
const BOT_PATTERN =
  /(bot|crawler|spider|crawling|slurp|headlesschrome|phantomjs|puppeteer|playwright|selenium|webdriver|curl\/|wget\/|python-requests|python-urllib|node-fetch|go-http-client|java\/|axios\/|postman|okhttp|libwww-perl|scrapy|lighthouse|pingdom|uptimerobot|semrush|ahrefs|dataprovider|facebookexternalhit|whatsapp|preview)/i;

/** Whether this agent should be excluded from analytics.
 *
 *  An absent user agent counts as a bot: every real browser sends one, so its
 *  absence means a script or a stripped proxy, neither of which is a visitor. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;

  return BOT_PATTERN.test(userAgent);
}

/** Order matters throughout: Edge's UA contains "Chrome", Chrome's contains
 *  "Safari", and Chromium-based browsers all claim to be several things. The
 *  most specific claim is tested first. */
function detectBrowser(ua: string): string | null {
  if (/edg[ea]?\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox\/|fxios\//i.test(ua)) return "Firefox";
  if (/chrome\/|crios\//i.test(ua)) return "Chrome";
  // Reached only when no Chromium marker matched, so this is really Safari.
  if (/safari\//i.test(ua)) return "Safari";

  return null;
}

function detectOs(ua: string): string | null {
  // iPadOS before macOS: an iPad's UA also contains "Mac OS X".
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/cros/i.test(ua)) return "ChromeOS";
  if (/linux/i.test(ua)) return "Linux";

  return null;
}

function detectDevice(ua: string): DeviceType {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  // "Android" alone can be a tablet; the "Mobile" token is what distinguishes
  // a phone, and Android tablets omit it.
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|phone/i.test(ua)) return "mobile";

  return "desktop";
}

export function parseUserAgent(userAgent: string | null | undefined): UserAgentInfo {
  const ua = userAgent ?? "";

  return {
    browser: detectBrowser(ua),
    os: detectOs(ua),
    device: detectDevice(ua),
  };
}
