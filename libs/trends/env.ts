/** Numeric env reader shared by the pipeline steps. Falls back rather than
 *  throwing on a malformed value: a typo in a tuning knob should not take the
 *  nightly run down, it should just run with the documented default. */
export function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();

  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
