const URGENCY_BG = {
  GREEN: 'bg-green/10 border-green/30 text-green',
  AMBER: 'bg-orange/10 border-orange/30 text-orangeDark',
  RED: 'bg-red-50 border-red-200 text-red-700',
};

const SEVERITY_COLOR = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange/10 text-orangeDark',
  MEDIUM: 'bg-paper2 text-ink2',
  LOW: 'bg-paper2 text-ink3',
};

export default function DiagnosticView({ output }) {
  if (!output) return null;
  return (
    <div className="space-y-6">
      {output.urgency_level && (
        <div className={`card p-4 border-2 ${URGENCY_BG[output.urgency_level]}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {output.urgency_level === 'GREEN' ? '✅' : output.urgency_level === 'AMBER' ? '⚠️' : '🚨'}
            </span>
            <div>
              <div className="font-title font-bold text-lg">
                Niveau {output.urgency_level}
              </div>
              <p className="text-sm mt-1">{output.ceo_verdict}</p>
            </div>
          </div>
        </div>
      )}

      {output.position && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">📍 Position stratégique</h4>
          <p className="text-sm">{output.position}</p>
        </div>
      )}

      {output.core_strengths?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-green">💪 Triangle des forces</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.core_strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {output.fault_lines?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-red-700">⚠️ Lignes de faille</h4>
          <div className="space-y-2">
            {output.fault_lines.map((f, i) => (
              <div key={i} className="border border-paper3 p-3 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm">{f.title}</strong>
                  {f.severity && (
                    <span className={`badge ${SEVERITY_COLOR[f.severity]}`}>{f.severity}</span>
                  )}
                </div>
                <p className="text-xs text-ink3 mt-1">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {output.opportunity_windows?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-blue">🌟 Fenêtres d'opportunité</h4>
          <div className="space-y-2">
            {output.opportunity_windows.map((o, i) => (
              <div key={i} className="border border-paper3 p-3 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm">{o.title}</strong>
                  {o.deadline_months && (
                    <span className="badge bg-blue/10 text-blue">⏱ {o.deadline_months}m</span>
                  )}
                </div>
                <p className="text-xs text-ink3 mt-1">{o.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
