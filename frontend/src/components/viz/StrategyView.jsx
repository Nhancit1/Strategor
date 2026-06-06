export default function StrategyView({ output }) {
  if (!output) return null;
  const axes = output.strategic_axes || [];

  return (
    <div className="space-y-4">
      {axes.map((axis, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl font-bold text-orange">{String(i + 1).padStart(2, '0')}</div>
            <div className="flex-1">
              <h3 className="font-title font-semibold text-lg">{axis.title}</h3>
              <p className="text-sm text-ink3 mt-1">{axis.description}</p>
            </div>
          </div>

          {axis.quick_wins?.length > 0 && (
            <div className="mb-3 p-3 bg-green/5 border border-green/30 rounded-lg">
              <strong className="text-sm text-green">⚡ Quick wins</strong>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                {axis.quick_wins.map((q, k) => <li key={k}>{q}</li>)}
              </ul>
            </div>
          )}

          {axis.initiatives?.length > 0 && (
            <div className="mb-3">
              <strong className="text-sm">Initiatives :</strong>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1 text-ink2">
                {axis.initiatives.map((init, k) => <li key={k}>{init}</li>)}
              </ul>
            </div>
          )}

          {axis.milestones?.length > 0 && (
            <div className="mb-3">
              <strong className="text-sm">Jalons :</strong>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {axis.milestones.map((m, k) => (
                  <div key={k} className="border border-paper3 p-2 rounded text-xs">
                    <div className="font-semibold text-orange">{m.quarter}</div>
                    <div className="text-ink3">{m.milestone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {axis.resources?.length > 0 && (
            <div className="text-xs text-ink3">
              <strong>Ressources :</strong> {axis.resources.join(' · ')}
            </div>
          )}
        </div>
      ))}

      {output.global_principles?.length > 0 && (
        <div className="card p-4 bg-paper2">
          <h4 className="font-title font-semibold mb-2">📐 Principes directeurs</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.global_principles.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
