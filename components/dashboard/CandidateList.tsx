import type { GeneratedCandidate } from "@/libs/names/generate";

export default function CandidateList({
  candidates,
}: {
  candidates: GeneratedCandidate[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {candidates.map((candidate) => (
        <li key={candidate.normalizedName} className="card p-5">
          <p className="text-lg font-bold tracking-tight">{candidate.name}</p>
          <p className="mt-1 text-sm text-muted">{candidate.rationale}</p>
        </li>
      ))}
    </ul>
  );
}
