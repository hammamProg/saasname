import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

/** Browser tests for the analytics tracker.
 *
 *  These exist because the tracker is the one piece of this product that runs
 *  inside other people's websites, and nothing else in the suite can catch a
 *  regression in it: it is plain JS served as a static asset, so `tsc` never
 *  sees it and the unit tests never execute it. Every install style it claims
 *  to support is exercised here, because "the tag does nothing" is the only
 *  symptom a customer ever sees and no other check in this repo can catch it.
 *
 *  Fully hermetic: every URL is fulfilled by Playwright, so no dev server, no
 *  database and no network are involved. */

const TRACKER = readFileSync(
  path.join(process.cwd(), "public/js/s.js"),
  "utf8",
);

// A deliberately fake uuid. Fixtures must not carry a real site id:
// it reads like production config, and anyone running the suite would
// be looking at a live record while debugging a test.
const SITE_ID = "00000000-0000-4000-8000-000000000001";
const ORIGIN = "https://collector.test";
const PAGE_URL = "https://customer-site.test/pricing";

type Beacon = Record<string, unknown>;

/** Serve the tracker, the host page, and capture beacons. */
async function harness(page: Page, bodyHtml: string): Promise<Beacon[]> {
  const beacons: Beacon[] = [];

  // Playwright sets navigator.webdriver, and the tracker treats that as
  // automation and refuses to track — correctly, in production. Undo it for
  // the test rather than weakening the real bot check.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  await page.route(`${ORIGIN}/js/s.js`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: TRACKER,
    }),
  );

  await page.route(`${ORIGIN}/api/webstats/event`, (route: Route) => {
    const body = route.request().postData();
    if (body) beacons.push(JSON.parse(body) as Beacon);

    return route.fulfill({
      status: 202,
      headers: { "access-control-allow-origin": "*" },
      body: "",
    });
  });

  await page.route("https://customer-site.test/**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><html><head><title>Pricing</title></head><body>${bodyHtml}</body></html>`,
    }),
  );

  return beacons;
}

/** Same as harness(), but also captures the identity pipeline's beacons to
 *  /api/webstats/collect separately — used by the tests below that exercise
 *  visitor_id, sessions, identify/reset and consent, none of which touch the
 *  legacy /event endpoint. */
async function harnessV2(
  page: Page,
  bodyHtml: string,
  options?: { collectStatus?: number },
): Promise<{ legacy: Beacon[]; collect: Beacon[] }> {
  const legacy: Beacon[] = [];
  const collect: Beacon[] = [];

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  await page.route(`${ORIGIN}/js/s.js`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: TRACKER }),
  );

  await page.route(`${ORIGIN}/api/webstats/event`, (route: Route) => {
    const body = route.request().postData();
    if (body) legacy.push(JSON.parse(body) as Beacon);
    return route.fulfill({
      status: 202,
      headers: { "access-control-allow-origin": "*" },
      body: "",
    });
  });

  await page.route(`${ORIGIN}/api/webstats/collect`, (route: Route) => {
    const body = route.request().postData();
    if (body) collect.push(JSON.parse(body) as Beacon);
    return route.fulfill({
      status: options?.collectStatus ?? 202,
      headers: { "access-control-allow-origin": "*" },
      body: "",
    });
  });

  await page.route("https://customer-site.test/**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><html><head><title>Pricing</title></head><body>${bodyHtml}</body></html>`,
    }),
  );

  return { legacy, collect };
}

const TAG = `<script defer data-site="${SITE_ID}" src="${ORIGIN}/js/s.js"></script>`;

test("tracks a parser-inserted script tag", async ({ page }) => {
  const beacons = await harness(
    page,
    `<script defer data-site="${SITE_ID}" src="${ORIGIN}/js/s.js"></script>`,
  );

  await page.goto(PAGE_URL);
  await expect.poll(() => beacons.length).toBeGreaterThan(0);

  expect(beacons[0]).toMatchObject({
    s: SITE_ID,
    u: PAGE_URL,
    ti: "Pricing",
  });
});

test("tracks a programmatically injected tag, as next/script does", async ({
  page,
}) => {
  // next/script, Google Tag Manager and consent wrappers all append the
  // element from JS rather than having it parsed from the HTML.
  const beacons = await harness(
    page,
    `<script>
       var s = document.createElement("script");
       s.src = "${ORIGIN}/js/s.js";
       s.setAttribute("data-site", "${SITE_ID}");
       document.body.appendChild(s);
     </script>`,
  );

  await page.goto(PAGE_URL);
  await expect.poll(() => beacons.length).toBeGreaterThan(0);

  expect(beacons[0]).toMatchObject({ s: SITE_ID, u: PAGE_URL });
});

test("tracks a module script, where document.currentScript is null", async ({
  page,
}) => {
  // The one insertion style that genuinely defeats `document.currentScript`:
  // the spec leaves it null for module scripts. Without the DOM fallback the
  // tracker returns before doing anything, and nothing surfaces the failure.
  const beacons = await harness(
    page,
    `<script type="module" data-site="${SITE_ID}" src="${ORIGIN}/js/s.js"></script>`,
  );

  await page.goto(PAGE_URL);
  await expect.poll(() => beacons.length).toBeGreaterThan(0);

  expect(beacons[0]).toMatchObject({ s: SITE_ID });
});

test("sends one pageview per SPA navigation, including back", async ({
  page,
}) => {
  const beacons = await harness(
    page,
    `<script defer data-site="${SITE_ID}" src="${ORIGIN}/js/s.js"></script>`,
  );

  await page.goto(PAGE_URL);
  await expect.poll(() => beacons.length).toBe(1);

  await page.evaluate(() => history.pushState({}, "", "/docs"));
  await expect.poll(() => beacons.length).toBe(2);

  // popstate: the case Umami's tracker misses entirely.
  await page.goBack();
  await expect.poll(() => beacons.length).toBe(3);

  expect(beacons.map((b) => new URL(String(b.u)).pathname)).toEqual([
    "/pricing",
    "/docs",
    "/pricing",
  ]);
});

test("does not double-fire when the url is unchanged", async ({ page }) => {
  const beacons = await harness(
    page,
    `<script defer data-site="${SITE_ID}" src="${ORIGIN}/js/s.js"></script>`,
  );

  await page.goto(PAGE_URL);
  await expect.poll(() => beacons.length).toBe(1);

  await page.evaluate(() => {
    history.pushState({}, "", location.href);
    history.replaceState({}, "", location.href);
  });

  await page.waitForTimeout(300);
  expect(beacons).toHaveLength(1);
});

test("respects the localStorage kill switch", async ({ page }) => {
  const beacons = await harness(
    page,
    `<script defer data-site="${SITE_ID}" src="${ORIGIN}/js/s.js"></script>`,
  );

  await page.addInitScript(() => localStorage.setItem("sn_ignore", "1"));
  await page.goto(PAGE_URL);
  await page.waitForTimeout(500);

  expect(beacons).toHaveLength(0);
});

test("does nothing without a data-site attribute", async ({ page }) => {
  const beacons = await harness(
    page,
    `<script defer src="${ORIGIN}/js/s.js"></script>`,
  );

  await page.goto(PAGE_URL);
  await page.waitForTimeout(500);

  expect(beacons).toHaveLength(0);
});

/* -------------------------------------------------------------------------
 * Identity pipeline: visitor_id, sessions, identify/reset, consent.
 * ---------------------------------------------------------------------- */

test("sets a first-party visitor cookie with the right attributes", async ({
  page,
}) => {
  await harnessV2(page, TAG);
  await page.goto(PAGE_URL);
  await page.waitForTimeout(300);

  const cookies = await page.context().cookies();
  const visitor = cookies.find((c) => c.name === "_sn_vid");

  expect(visitor).toBeDefined();
  expect(visitor?.sameSite).toBe("Lax");
  expect(visitor?.path).toBe("/");
  // Roughly two years out, not a session cookie.
  expect((visitor?.expires ?? 0) * 1000).toBeGreaterThan(Date.now() + 365 * 24 * 60 * 60 * 1000);
});

test("sends one collect page() call on load, flagged as a new session", async ({
  page,
}) => {
  const { collect } = await harnessV2(page, TAG);
  await page.goto(PAGE_URL);
  await expect.poll(() => collect.length).toBeGreaterThan(0);

  expect(collect[0]).toMatchObject({ s: SITE_ID, t: "page", new: true });
  expect(typeof collect[0].v).toBe("string");
  expect(typeof collect[0].ss).toBe("string");
});

test("reuses the same visitor_id and session_id across SPA navigation", async ({
  page,
}) => {
  const { collect } = await harnessV2(page, TAG);
  await page.goto(PAGE_URL);
  await expect.poll(() => collect.length).toBe(1);

  await page.evaluate(() => history.pushState({}, "", "/docs"));
  await expect.poll(() => collect.length).toBe(2);

  expect(collect[1].v).toBe(collect[0].v);
  expect(collect[1].ss).toBe(collect[0].ss);
  // Only the first call of the session captures source.
  expect(collect[1].new).toBe(false);
});

test("getVisitorId()/getSessionId() expose the active identity", async ({
  page,
}) => {
  await harnessV2(page, TAG);
  await page.goto(PAGE_URL);
  await page.waitForTimeout(300);

  const ids = await page.evaluate(() => ({
    visitor: (window as unknown as { saasname: { getVisitorId(): string } }).saasname.getVisitorId(),
    session: (window as unknown as { saasname: { getSessionId(): string } }).saasname.getSessionId(),
  }));

  expect(ids.visitor).toMatch(/^[0-9a-f-]{36}$/);
  expect(ids.session).toMatch(/^[0-9a-f-]{36}$/);
});

test("identify() attaches the user id to subsequent collect calls", async ({
  page,
}) => {
  const { collect } = await harnessV2(page, TAG);
  await page.goto(PAGE_URL);
  await expect.poll(() => collect.length).toBe(1);

  await page.evaluate(() => {
    (window as unknown as { saasname: { identify(id: string): void } }).saasname.identify(
      "user_42",
    );
  });
  await expect.poll(() => collect.length).toBe(2);
  expect(collect[1]).toMatchObject({ t: "identify", u: "user_42" });

  await page.evaluate(() => history.pushState({}, "", "/next"));
  await expect.poll(() => collect.length).toBe(3);
  expect(collect[2].u).toBe("user_42");
});

test("reset() rotates the visitor id and drops the identified user", async ({
  page,
}) => {
  const { collect } = await harnessV2(page, TAG);
  await page.goto(PAGE_URL);
  await expect.poll(() => collect.length).toBe(1);
  const firstVisitor = collect[0].v;

  await page.evaluate(() => {
    const w = window as unknown as {
      saasname: { identify(id: string): void; reset(): void; track(name: string): void };
    };
    w.saasname.identify("user_1");
    w.saasname.reset();
    w.saasname.track("after-reset");
  });
  await expect.poll(() => collect.length).toBeGreaterThanOrEqual(3);

  const afterReset = collect[collect.length - 1];
  expect(afterReset.v).not.toBe(firstVisitor);
  expect(afterReset.u).toBeUndefined();
});

test("setConsent(false) stops tracking entirely and clears the cookie", async ({
  page,
}) => {
  const { collect } = await harnessV2(page, TAG);
  await page.goto(PAGE_URL);
  await expect.poll(() => collect.length).toBe(1);

  await page.evaluate(() => {
    const w = window as unknown as {
      saasname: { setConsent(v: boolean): void; track(name: string): void };
    };
    w.saasname.setConsent(false);
    w.saasname.track("should-not-send");
  });
  await page.waitForTimeout(300);

  expect(collect).toHaveLength(1); // No new call after consent was denied.

  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "_sn_vid")).toBeUndefined();
});

test("does not throw when the collection endpoint is unavailable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await harnessV2(page, TAG, { collectStatus: 500 });
  await page.goto(PAGE_URL);
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    (window as unknown as { saasname: { track(name: string): void } }).saasname.track("x");
  });
  await page.waitForTimeout(300);

  expect(errors).toHaveLength(0);
});
