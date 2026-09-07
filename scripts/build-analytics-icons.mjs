/** Generates the analytics icon sets in `public/analytics/`.
 *
 *  Icons are copied from licensed sources rather than hand-drawn, and the
 *  script is committed so the sets can be regenerated when a source updates:
 *
 *    node scripts/build-analytics-icons.mjs
 *
 *  Sources
 *  - Browsers: simple-icons (CC0-1.0). The SVGs are public domain; the marks
 *    themselves remain the trademarks of their owners and are used here only
 *    to identify the browser a visitor used, which is nominative use.
 *  - Flags: flag-icons (MIT), 4x3 aspect, named by ISO 3166-1 alpha-2.
 *
 *  simple-icons ships monochrome paths, so the brand colour is applied here
 *  from the package's own metadata. It no longer carries Microsoft Edge or
 *  Samsung Internet, so those are not generated - but an icon dropped into the
 *  directory by hand is picked up all the same. The script only deletes files
 *  it generated itself, and the manifest is built from whatever is actually on
 *  disk, so a hand-added mark in any format survives a rebuild and resolves.
 */

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import * as simpleIcons from "simple-icons";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "analytics");

/** Browser label emitted by libs/webstats/useragent.ts → simple-icons export. */
const BROWSERS = {
  chrome: "siGooglechrome",
  safari: "siSafari",
  firefox: "siFirefoxbrowser",
  opera: "siOpera",
};

/** Used for any browser without a licensed mark — currently Edge and Samsung
 *  Internet — and for anything the parser has not seen before. */
const FALLBACK_BROWSER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6B6660" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/></svg>`;

/** Shown when a visitor's country could not be resolved. */
const FALLBACK_FLAG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#EDEAE6"/><circle cx="2" cy="1.5" r="0.8" fill="none" stroke="#B9B4AE" stroke-width="0.14"/><path d="M0.4 1.5h3.2M2 0.7a3 3 0 0 1 0 1.6a3 3 0 0 1 0-1.6z" fill="none" stroke="#B9B4AE" stroke-width="0.12"/></svg>`;

async function buildBrowsers() {
  const dir = path.join(OUT, "browsers");
  await mkdir(dir, { recursive: true });

  // Only the generated names, never the directory. Wiping it would silently
  // delete hand-added icons on the next rebuild.
  for (const name of Object.keys(BROWSERS)) {
    await rm(path.join(dir, `${name}.svg`), { force: true });
  }

  let written = 0;

  for (const [name, exportName] of Object.entries(BROWSERS)) {
    const icon = simpleIcons[exportName];

    if (!icon) {
      console.warn(`  skipped ${name}: ${exportName} not in simple-icons`);
      continue;
    }

    // The shipped SVG has no fill, so it would render as currentColor. Brand
    // colour is what makes these recognisable at 16px.
    const svg = icon.svg.replace("<svg ", `<svg fill="#${icon.hex}" `);
    await writeFile(path.join(dir, `${name}.svg`), svg, "utf8");
    written += 1;
  }

  await writeFile(path.join(dir, "_fallback.svg"), FALLBACK_BROWSER, "utf8");

  return written;
}

async function buildFlags() {
  const source = path.join(ROOT, "node_modules", "flag-icons", "flags", "4x3");
  const dir = path.join(OUT, "flags");

  await mkdir(dir, { recursive: true });

  const files = (await readdir(source)).filter((f) => f.endsWith(".svg"));

  for (const file of files) {
    await cp(path.join(source, file), path.join(dir, file));
  }

  await writeFile(path.join(dir, "_fallback.svg"), FALLBACK_FLAG, "utf8");

  return files.length;
}

const browsers = await buildBrowsers();
const flags = await buildFlags();

/* A manifest so the app can tell "we have no icon for this" from "the file is
   missing", without a filesystem read per row at request time.

   Full filenames, not slugs. Hand-added icons are not necessarily SVG - the
   Edge mark is a PNG - and recording only the stem forced the resolver to
   assume an extension, which made those files unreachable. */
const IMAGE = /\.(svg|png|webp|avif|jpg|jpeg)$/i;

const listed = async (kind) =>
  (await readdir(path.join(OUT, kind)))
    .filter((f) => IMAGE.test(f) && !f.startsWith("_"))
    .sort();

const manifest = {
  browsers: await listed("browsers"),
  flags: await listed("flags"),
};

await writeFile(
  path.join(OUT, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`browsers: ${browsers} generated, ${manifest.browsers.length} total`);
console.log(`flags: ${flags} generated, ${manifest.flags.length} total`);
