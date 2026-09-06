import { describe, expect, it } from "vitest";
import { isBot, parseUserAgent } from "./useragent";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const SAFARI_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const SAFARI_IPAD =
  "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/604.1";
const FIREFOX_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";
const EDGE_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";

describe("parseUserAgent", () => {
  it("identifies Chrome on macOS desktop", () => {
    expect(parseUserAgent(CHROME_MAC)).toEqual({
      browser: "Chrome",
      os: "macOS",
      device: "desktop",
    });
  });

  it("identifies Safari on macOS, not Chrome", () => {
    // Safari's UA contains the literal "Safari/", and Chrome's contains both
    // "Chrome/" and "Safari/" — order of checks is what makes this correct.
    expect(parseUserAgent(SAFARI_MAC).browser).toBe("Safari");
  });

  it("identifies Edge, not Chrome", () => {
    // Edge's UA contains "Chrome/" too, so Edge must be tested first.
    expect(parseUserAgent(EDGE_WIN).browser).toBe("Edge");
  });

  it("identifies Firefox on Windows", () => {
    expect(parseUserAgent(FIREFOX_WIN)).toEqual({
      browser: "Firefox",
      os: "Windows",
      device: "desktop",
    });
  });

  it("classifies an iPhone as mobile running iOS", () => {
    expect(parseUserAgent(SAFARI_IPHONE)).toEqual({
      browser: "Safari",
      os: "iOS",
      device: "mobile",
    });
  });

  it("classifies an iPad as tablet, not mobile", () => {
    expect(parseUserAgent(SAFARI_IPAD).device).toBe("tablet");
  });

  it("classifies an Android phone as mobile", () => {
    expect(parseUserAgent(CHROME_ANDROID)).toEqual({
      browser: "Chrome",
      os: "Android",
      device: "mobile",
    });
  });

  it("returns nulls rather than guessing for an unrecognised agent", () => {
    expect(parseUserAgent("something-entirely-new/1.0")).toEqual({
      browser: null,
      os: null,
      device: "desktop",
    });
  });

  it("handles an empty user agent without throwing", () => {
    expect(parseUserAgent("")).toEqual({
      browser: null,
      os: null,
      device: "desktop",
    });
  });
});

describe("isBot", () => {
  it.each([
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "curl/8.4.0",
    "python-requests/2.31.0",
    "node-fetch/1.0",
    "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/140.0.0.0",
    "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Go-http-client/1.1",
    "axios/1.7.2",
    "Slackbot-LinkExpanding 1.0",
  ])("flags %s", (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it.each([CHROME_MAC, SAFARI_IPHONE, FIREFOX_WIN, EDGE_WIN, CHROME_ANDROID])(
    "does not flag a real browser",
    (ua) => {
      expect(isBot(ua)).toBe(false);
    },
  );

  it("treats a missing user agent as a bot", () => {
    // Every real browser sends one. Absence is a script.
    expect(isBot("")).toBe(true);
  });
});
