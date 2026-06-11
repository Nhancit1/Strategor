const sevBadge = { HIGH: 'bg-red-600 text-white', MEDIUM: 'bg-orange text-white', LOW: 'bg-paper3 text-ink' };

export default function ConsistencyView({ output }) {
  if (!output) return null;
  const items = output.inconsistencies || [];

  return (
    <div className="space-y-6">
      {output.overall_consistency && (
        <div className="card p-4 bg-orange/5 border-orange/30">
          <h4 className="font-title font-semibold mb-1">Cohérence globale</h4>
          <p className="text-sm">{output.overall_consistency}</p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-4 text-sm text-green">✓ Aucune incohérence majeure détectée.</div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="card p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium">{it.description}</p>
                <span className={`badge ${sevBadge[it.severity] || 'bg-paper3'}`}>{it.severity}</span>
              </div>
              {it.agents_involved?.length > 0 && (
                <p className="text-xs text-ink3 mb-1">Agents concernés : {it.agents_involved.join(', ')}</p>
              )}
              {it.suggested_fix && <p className="text-sm"><strong>Correction suggérée :</strong> {it.suggested_fix}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
