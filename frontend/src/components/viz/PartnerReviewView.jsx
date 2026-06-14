import { Award, AlertTriangle, CheckCircle2, ListChecks } from 'lucide-react';

const READINESS = {
  READY: { label: 'Prêt pour le board', cls: 'bg-green/10 text-green border-green/30' },
  MINOR_REVISIONS: { label: 'Révisions mineures', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  MAJOR_REVISIONS: { label: 'Révisions majeures', cls: 'bg-orange/10 text-orangeDark border-orange/30' },
  NOT_READY: { label: 'Non prêt', cls: 'bg-red-50 text-red-700 border-red-200' },
};
const SEV = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-blue-100 text-blue-700',
};
const DIM = {
  STRATEGIC_CHOICE: 'Choix stratégique',
  EVIDENCE: 'Preuves',
  FRAMEWORK_RIGOR: 'Rigueur des cadres',
  DELIVERABILITY: 'Faisabilité',
  RISK: 'Risque',
};

/** Strategic partner review (Agent 16) — the "would a board accept this?" lens. */
export default function PartnerReviewView({ output }) {
  if (!output) return null;
  const {
    board_readiness, verdict,
    strengths = [], weaknesses = [], required_fixes = [],
  } = output;
  const r = READINESS[board_readiness] || READINESS.MINOR_REVISIONS;

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <div className="flex flex-col gap-3">
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${r.cls}`}>
          <Award size={15} /> {r.label}
        </div>
        {verdict && <p className="text-ink2 leading-relaxed">{verdict}</p>}
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div>
          <h3 className="font-title text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-green" /> Points forts
          </h3>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <div>
          <h3 className="font-title text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-orange" /> Faiblesses ({weaknesses.length})
          </h3>
          <ul className="space-y-2">
            {weaknesses.map((w, i) => (
              <li key={i} className="rounded-lg border border-paper3 bg-white p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${SEV[w.severity] || SEV.LOW}`}>
                    {w.severity}
                  </span>
                  {w.dimension && (
                    <span className="rounded bg-paper2 px-1.5 py-0.5 text-[11px] text-ink3">
                      {DIM[w.dimension] || w.dimension}
                    </span>
                  )}
                  {Array.isArray(w.agents_involved) && w.agents_involved.length > 0 && (
                    <span className="text-[11px] text-ink3">
                      Agent{w.agents_involved.length > 1 ? 's' : ''} {w.agents_involved.join(', ')}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-ink">{w.issue}</p>
                {w.recommendation && (
                  <p className="mt-1 text-sm text-ink2">
                    <span className="font-medium text-ink3">Recommandation : </span>{w.recommendation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Required fixes */}
      {required_fixes.length > 0 && (
        <div className="rounded-xl border border-orange/30 bg-orange/5 p-4">
          <h3 className="font-title text-sm font-semibold text-orangeDark mb-2 flex items-center gap-1.5">
            <ListChecks size={15} /> Corrections indispensables avant présentation
          </h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink2">
            {required_fixes.map((f, i) => <li key={i}>{f}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
