import EditableText from './EditableText';

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

export default function BcgMatrix({ output, editing, onOutputChange }) {
  if (!output) return null;
  const lines = output.lines || [];

  const byQuadrant = lines.reduce((acc, line) => {
    if (!acc[line.quadrant]) acc[line.quadrant] = [];
    acc[line.quadrant].push(line);
    return acc;
  }, {});

  const updateLine = (lineIndex, field, value) => {
    const clone = structuredClone(output);
    clone.lines[lineIndex][field] = value;
    onOutputChange?.(clone);
  };

  const updateDecision = (index, value) => {
    const clone = structuredClone(output);
    clone.key_decisions[index] = value;
    onOutputChange?.(clone);
  };

  // Build a map from line to its original index in the lines array
  const lineIndexMap = new Map();
  lines.forEach((line, idx) => lineIndexMap.set(line, idx));

  const E = ({ value, onChange, multiline }) => (
    <EditableText value={value} onChange={editing ? onChange : undefined} multiline={multiline} />
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(QUADRANTS).map(([key, q]) => (
          <div key={key} className={`border-2 rounded-xl p-4 ${q.bg}`}>
            <h3 className={`font-title font-semibold mb-3 ${q.text}`}>{q.label}</h3>
            <div className="space-y-2">
              {(byQuadrant[key] || []).map((line, i) => {
                const origIdx = lineIndexMap.get(line);
                return (
                  <div key={i} className="bg-white p-3 rounded-lg border border-paper3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <strong className="text-sm">
                        <E value={line.name} onChange={(v) => updateLine(origIdx, 'name', v)} />
                      </strong>
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
                      <p className="text-xs mt-1 text-ink3">
                        <E value={line.rationale} onChange={(v) => updateLine(origIdx, 'rationale', v)} multiline />
                      </p>
                    )}
                  </div>
                );
              })}
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
          <p className="text-sm">
            <E
              value={output.portfolio_balance}
              onChange={(v) => onOutputChange?.({ ...output, portfolio_balance: v })}
              multiline
            />
          </p>
        </div>
      )}

      {output.key_decisions?.length > 0 && (
        <div className="card p-4 bg-orange/5 border-orange/30">
          <h4 className="font-title font-semibold mb-2">🎯 Décisions clés</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.key_decisions.map((d, i) => (
              <li key={i}>
                <E value={d} onChange={(v) => updateDecision(i, v)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
