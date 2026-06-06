/** Normalize AI output that may be an array, comma-string, or undefined → always array */
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Safely render text to prevent React crash if AI returns an object instead of a string */
function safeText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

export default function StrategyView({ output }) {
  if (!output) return null;

  // Try to find the axes array. Sometimes the AI returns { axes: [...] } or just an array directly.
  let axes = [];
  if (Array.isArray(output.strategic_axes)) {
    axes = output.strategic_axes;
  } else if (Array.isArray(output.axes)) {
    axes = output.axes;
  } else if (Array.isArray(output)) {
    axes = output; // The whole output might be an array of axes
  } else if (typeof output.strategic_axes === 'object' && output.strategic_axes !== null) {
    // Sometimes it returns an object of objects
    axes = Object.values(output.strategic_axes);
  }

  const globalPrinciples = toArray(output.global_principles);

  if (axes.length === 0 && globalPrinciples.length === 0) {
    return (
      <div className="card p-6 text-ink3 text-sm text-center">
        Aucun axe stratégique disponible ou format non reconnu.
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
              <h3 className="font-title font-semibold text-lg">{safeText(axis.title || axis.name || `Axe ${i + 1}`)}</h3>
              <p className="text-sm text-ink3 mt-1">{safeText(axis.description || axis.rationale || '')}</p>
            </div>
          </div>

          {toArray(axis.quick_wins).length > 0 && (
            <div className="mb-3 p-3 bg-green/5 border border-green/30 rounded-lg">
              <strong className="text-sm text-green">⚡ Quick wins</strong>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                {toArray(axis.quick_wins).map((q, k) => <li key={k}>{safeText(q)}</li>)}
              </ul>
            </div>
          )}

          {toArray(axis.initiatives).length > 0 && (
            <div className="mb-3">
              <strong className="text-sm">Initiatives :</strong>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1 text-ink2">
                {toArray(axis.initiatives).map((init, k) => <li key={k}>{safeText(init)}</li>)}
              </ul>
            </div>
          )}

          {toArray(axis.milestones).length > 0 && (
            <div className="mb-3">
              <strong className="text-sm">Jalons :</strong>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {toArray(axis.milestones).map((m, k) => (
                  <div key={k} className="border border-paper3 p-2 rounded text-xs">
                    {typeof m === 'object' && m !== null ? (
                      <>
                        <div className="font-semibold text-orange">{safeText(m.quarter || m.trimestre || m.date)}</div>
                        <div className="text-ink3">{safeText(m.milestone || m.description || m.jalon)}</div>
                      </>
                    ) : (
                      <div className="text-ink3">{safeText(m)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {toArray(axis.resources).length > 0 && (
            <div className="text-xs text-ink3">
              <strong>Ressources :</strong> {toArray(axis.resources).map(safeText).join(' · ')}
            </div>
          )}
        </div>
      ))}

      {globalPrinciples.length > 0 && (
        <div className="card p-4 bg-paper2">
          <h4 className="font-title font-semibold mb-2">📐 Principes directeurs</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {globalPrinciples.map((p, i) => <li key={i}>{safeText(p)}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
