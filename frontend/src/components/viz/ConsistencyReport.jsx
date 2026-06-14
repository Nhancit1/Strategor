import { useState } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, ChevronDown, ChevronUp, Wrench } from 'lucide-react';

const SEV = {
  error: { badge: 'bg-red-100 text-red-700', dot: 'text-red-600', label: 'Erreur' },
  warning: { badge: 'bg-amber-100 text-amber-700', dot: 'text-amber-600', label: 'À vérifier' },
  info: { badge: 'bg-blue-100 text-blue-700', dot: 'text-blue-600', label: 'Info' },
};

/**
 * Deterministic numeric-integrity report (from numeric_integrity.py).
 * Complements Agent 15's semantic review (shown in the "Cohérence" tab); this panel
 * surfaces the machine-checked arithmetic / BCG / cross-agent findings.
 */
export default function ConsistencyReport({ report, onOpenReview }) {
  const [open, setOpen] = useState(true);
  if (!report || !report.summary) return null;

  const { status, summary, checks = [], semantic } = report;
  const errors = summary.errors || 0;
  const warnings = summary.warnings || 0;
  const semCount = semantic?.count || 0;

  const corr = report.corrections;
  const CorrectionLine = () =>
    corr && Array.isArray(corr.regenerated_agents) && corr.regenerated_agents.length > 0 ? (
      <div className="mb-2 flex items-start gap-2 text-xs text-ink2">
        <Wrench size={13} className="mt-0.5 shrink-0 text-green" />
        <span>
          Auto-correction : agent{corr.regenerated_agents.length > 1 ? 's' : ''}{' '}
          {corr.regenerated_agents.join(', ')} régénéré{corr.regenerated_agents.length > 1 ? 's' : ''}
          {' — '}{corr.errors_initial} → {corr.errors_final} erreur{corr.errors_initial > 1 ? 's' : ''}
          {corr.converged ? ' (cohérence rétablie)' : ''}.
        </span>
      </div>
    ) : null;

  const SemanticLine = () =>
    semCount > 0 ? (
      <button
        onClick={onOpenReview}
        className="mt-2 text-xs text-ink3 underline decoration-dotted underline-offset-2 hover:text-ink"
      >
        + {semCount} point{semCount > 1 ? 's' : ''} signalé{semCount > 1 ? 's' : ''} par la revue
        de cohérence sémantique (agent 15) — voir l'onglet « Cohérence »
      </button>
    ) : null;

  // All clear on the deterministic checks.
  if (status === 'ok' || checks.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-green/30 bg-green/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-green" />
          <span className="text-sm font-medium text-green">
            Contrôle de cohérence numérique : aucun écart détecté.
          </span>
        </div>
        <CorrectionLine />
        <SemanticLine />
      </div>
    );
  }

  const tone = errors > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50';

  return (
    <div className={`mb-6 rounded-xl border ${tone}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          {errors > 0 ? <XCircle size={18} className="text-red-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
          <span className="text-sm font-semibold text-ink">Contrôle de cohérence numérique</span>
          {errors > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {errors} erreur{errors > 1 ? 's' : ''}
            </span>
          )}
          {warnings > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {warnings} à vérifier
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-ink3" /> : <ChevronDown size={16} className="text-ink3" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <CorrectionLine />
          <ul className="space-y-2">
            {checks.map((c, i) => {
              const sev = SEV[c.severity] || SEV.info;
              return (
                <li key={`${c.id}-${i}`} className="rounded-lg border border-paper3 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${sev.dot}`} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">{c.title}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${sev.badge}`}>{sev.label}</span>
                        {Array.isArray(c.agents) && c.agents.length > 0 && (
                          <span className="text-[11px] text-ink3">Agent{c.agents.length > 1 ? 's' : ''} {c.agents.join(', ')}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-ink2">{c.detail}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <SemanticLine />
        </div>
      )}
    </div>
  );
}
