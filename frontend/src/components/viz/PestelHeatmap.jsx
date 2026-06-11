import EditableText from './EditableText';

const DIMENSIONS = [
  { key: 'political', label: 'Politique', icon: '🏛️' },
  { key: 'economic', label: 'Économique', icon: '💰' },
  { key: 'social', label: 'Socioculturel', icon: '👥' },
  { key: 'technological', label: 'Technologique', icon: '💻' },
  { key: 'environmental', label: 'Environnemental', icon: '🌿' },
  { key: 'legal', label: 'Légal', icon: '⚖️' },
];

const IMPACT_COLORS = {
  POSITIVE: 'bg-green/10 border-green/30 text-green',
  NEGATIVE: 'bg-red-50 border-red-200 text-red-700',
  NEUTRAL: 'bg-paper2 border-paper3 text-ink2',
};

export default function PestelHeatmap({ output, editing, onOutputChange }) {
  if (!output) return null;

  const updateFactor = (dimKey, index, field, value) => {
    const clone = structuredClone(output);
    clone[dimKey][index][field] = value;
    onOutputChange?.(clone);
  };

  const updateInsight = (index, value) => {
    const clone = structuredClone(output);
    clone.key_insights[index] = value;
    onOutputChange?.(clone);
  };

  const E = ({ value, onChange, multiline }) => (
    <EditableText value={value} onChange={editing ? onChange : undefined} multiline={multiline} />
  );

  return (
    <div className="space-y-6">
      {DIMENSIONS.map(({ key, label, icon }) => {
        const factors = output[key] || [];
        if (factors.length === 0) return null;
        return (
          <div key={key}>
            <h3 className="font-title font-semibold text-lg mb-3">
              {icon} {label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {factors.map((f, idx) => (
                <div key={idx} className={`border rounded-lg p-3 ${IMPACT_COLORS[f.impact] || ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm">
                      <E value={f.title} onChange={(v) => updateFactor(key, idx, 'title', v)} />
                    </div>
                    <div className="text-xs whitespace-nowrap">
                      {'●'.repeat(f.intensity || 1)}
                      <span className="opacity-30">{'●'.repeat(5 - (f.intensity || 1))}</span>
                    </div>
                  </div>
                  <p className="text-xs mt-1">
                    <E value={f.description} onChange={(v) => updateFactor(key, idx, 'description', v)} multiline />
                  </p>
                  {f.horizon && (
                    <p className="text-xs mt-2 opacity-75">
                      Horizon : <E value={f.horizon} onChange={(v) => updateFactor(key, idx, 'horizon', v)} />
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {output.key_insights?.length > 0 && (
        <div className="card p-4 bg-paper2">
          <h4 className="font-title font-semibold mb-2">🎯 Insights clés</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.key_insights.map((insight, i) => (
              <li key={i}>
                <E value={insight} onChange={(v) => updateInsight(i, v)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
