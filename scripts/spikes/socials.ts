/** Throwaway spike. Delete once findings are recorded. */
const HANDLE_TAKEN = "slack";
const HANDLE_FREE = "zzqxwvunlikelyhandle99";

const PLATFORMS = [
  { id: "github", url: (h: string) => `https://github.com/${h}` },
  { id: "x", url: (h: string) => `https://x.com/${h}` },
  { id: "instagram", url: (h: string) => `https://www.instagram.com/${h}/` },
  { id: "tiktok", url: (h: string) => `https://www.tiktok.com/@${h}` },
  { id: "linkedin", url: (h: string) => `https://www.linkedin.com/company/${h}` },
];

async function main() {
  for (const p of PLATFORMS) {
    for (const handle of [HANDLE_TAKEN, HANDLE_FREE]) {
      try {
        const res = await fetch(p.url(handle), {
          method: "GET",
          redirect: "manual",
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
        });
        const body = await res.text();
        const bodySample = body.slice(0, 200).replace(/\s+/g, " ").trim();
        console.log(`${p.id.padEnd(10)} ${handle.padEnd(24)} ${res.status}`);
        console.log(`  body[0:200]: ${bodySample}`);
      } catch (err) {
        console.log(`${p.id.padEnd(10)} ${handle.padEnd(24)} ERROR ${(err as Error).message}`);
      }
    }
  }
}

main();

export {};
