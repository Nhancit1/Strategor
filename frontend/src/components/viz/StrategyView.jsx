/** Normalize AI output that may be an array, comma-string, or undefined → always array */
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

export default function StrategyView({ output }) {
  if (!output) return null;

  // strategic_axes can be an array of objects or missing entirely
  const axes = Array.isArray(output.strategic_axes) ? output.strategic_axes : [];
  const globalPrinciples = toArray(output.global_principles);

  if (axes.length === 0 && globalPrinciples.length === 0) {
    return (
      <div className="card p-6 text-ink3 text-sm text-center">
        Aucun axe stratégique disponible pour ce projet.
        <pre className="mt-4 bg-paper2 p-3 rounded text-xs text-left overflow-auto max-h-60">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {axes.map((axis, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl font-bold text-orange">{String(i + 1).padStart(2, '0')}</div>
            <div className="flex-1">
              <h3 className="font-title font-semibold text-lg">{axis.title || axis.name || `Axe ${i + 1}`}</h3>
              <p className="text-sm text-ink3 mt-1">{axis.description || axis.rationale || ''}</p>
            </div>
          </div>

          {toArray(axis.quick_wins).length > 0 && (
            <div className="mb-3 p-3 bg-green/5 border border-green/30 rounded-lg">
              <strong className="text-sm text-green">⚡ Quick wins</strong>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                {toArray(axis.quick_wins).map((q, k) => <li key={k}>{q}</li>)}
              </ul>
            </div>
          )}

          {toArray(axis.initiatives).length > 0 && (
            <div className="mb-3">
              <strong className="text-sm">Initiatives :</strong>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1 text-ink2">
                {toArray(axis.initiatives).map((init, k) => <li key={k}>{init}</li>)}
              </ul>
            </div>
          )}

          {toArray(axis.milestones).length > 0 && (
            <div className="mb-3">
              <strong className="text-sm">Jalons :</strong>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {toArray(axis.milestones).map((m, k) => (
                  <div key={k} className="border border-paper3 p-2 rounded text-xs">
                    {typeof m === 'object' ? (
                      <>
                        <div className="font-semibold text-orange">{m.quarter}</div>
                        <div className="text-ink3">{m.milestone}</div>
                      </>
                    ) : (
                      <div className="text-ink3">{m}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {toArray(axis.resources).length > 0 && (
            <div className="text-xs text-ink3">
              <strong>Ressources :</strong> {toArray(axis.resources).join(' · ')}
            </div>
          )}
        </div>
      ))}

      {globalPrinciples.length > 0 && (
        <div className="card p-4 bg-paper2">
          <h4 className="font-title font-semibold mb-2">📐 Principes directeurs</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {globalPrinciples.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
