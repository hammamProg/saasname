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

const SITE_ID = "4735c4e1-6ee4-43ac-94d0-d6a240faca03";
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
