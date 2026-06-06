const QUADRANTS = {
  STAR: { label: '⭐ Star', bg: 'bg-orange/10 border-orange', text: 'text-orangeDark' },
  CASH_COW: { label: '🐄 Cash Cow', bg: 'bg-green/10 border-green', text: 'text-green' },
  QUESTION_MARK: { label: '❓ Question Mark', bg: 'bg-blue/10 border-blue', text: 'text-blue' },
  DOG: { label: '🐕 Dog', bg: 'bg-paper3 border-ink3', text: 'text-ink2' },
};

const RECO_BADGE = {
  DEVELOP: 'bg-green text-white',
  HARVEST: 'bg-orange text-white',
  MAINTAIN: 'bg-blue text-white',
  DIVEST: 'bg-red-600 text-white',
};

export default function BcgMatrix({ output }) {
  if (!output) return null;
  const lines = output.lines || [];

  const byQuadrant = lines.reduce((acc, line) => {
    if (!acc[line.quadrant]) acc[line.quadrant] = [];
    acc[line.quadrant].push(line);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(QUADRANTS).map(([key, q]) => (
          <div key={key} className={`border-2 rounded-xl p-4 ${q.bg}`}>
            <h3 className={`font-title font-semibold mb-3 ${q.text}`}>{q.label}</h3>
            <div className="space-y-2">
              {(byQuadrant[key] || []).map((line, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-paper3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <strong className="text-sm">{line.name}</strong>
                    {line.recommendation && (
                      <span className={`badge text-xs ${RECO_BADGE[line.recommendation]}`}>
                        {line.recommendation}
                      </span>
                    )}
                  </div>
                  {line.revenue_share_percent != null && (
                    <div className="text-xs text-ink3">CA : {line.revenue_share_percent}%</div>
                  )}
                  {line.rationale && (
                    <p className="text-xs mt-1 text-ink3">{line.rationale}</p>
                  )}
                </div>
              ))}
              {(!byQuadrant[key] || byQuadrant[key].length === 0) && (
                <div className="text-xs text-ink3 italic">Aucune ligne dans ce quadrant</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {output.portfolio_balance && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">⚖️ Équilibre du portefeuille</h4>
          <p className="text-sm">{output.portfolio_balance}</p>
        </div>
      )}

      {output.key_decisions?.length > 0 && (
        <div className="card p-4 bg-orange/5 border-orange/30">
          <h4 className="font-title font-semibold mb-2">🎯 Décisions clés</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.key_decisions.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
