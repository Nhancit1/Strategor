import EditableText from './EditableText';

const CATEGORIES = [
  { key: 'financial', label: '💰 Financier', color: 'text-orange' },
  { key: 'customer', label: '🛒 Client', color: 'text-blue' },
  { key: 'process', label: '⚙️ Processus', color: 'text-green' },
  { key: 'learning', label: '🎓 Apprentissage', color: 'text-orangeDark' },
];

export default function KpiDashboard({ output, editing, onOutputChange }) {
  if (!output) return null;

  const update = (key, value) => {
    onOutputChange?.({ ...output, [key]: value });
  };

  const updateKpi = (category, index, field, value) => {
    const clone = structuredClone(output);
    clone[category][index][field] = value;
    onOutputChange?.(clone);
  };

  const E = ({ value, onChange, multiline }) => (
    <EditableText value={value} onChange={editing ? onChange : undefined} multiline={multiline} />
  );

  return (
    <div className="space-y-6">
      {output.north_star_metric && (
        <div className="card p-4 bg-orange/5 border-orange/30 text-center">
          <div className="text-xs text-orangeDark uppercase tracking-wide">⭐ North Star Metric</div>
          <div className="font-title text-xl font-bold mt-1">
            <E value={output.north_star_metric} onChange={(v) => update('north_star_metric', v)} />
          </div>
        </div>
      )}

      {CATEGORIES.map(({ key, label, color }) => {
        const kpis = output[key] || [];
        if (kpis.length === 0) return null;
        return (
          <div key={key}>
            <h3 className={`font-title font-semibold text-lg mb-3 ${color}`}>{label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {kpis.map((kpi, i) => (
                <div key={i} className="card p-4">
                  <div className="font-title font-semibold text-sm mb-1">
                    <E value={kpi.name} onChange={(v) => updateKpi(key, i, 'name', v)} />
                  </div>
                  <div className="text-xs text-ink3 mb-2">
                    <E value={kpi.definition} onChange={(v) => updateKpi(key, i, 'definition', v)} multiline />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {kpi.current_value && (
                      <div>
                        <div className="text-ink3">Actuel</div>
                        <div className="font-semibold">
                          <E value={kpi.current_value} onChange={(v) => updateKpi(key, i, 'current_value', v)} />
                        </div>
                      </div>
                    )}
                    {kpi.target_12m && (
                      <div>
                        <div className="text-ink3">Cible 12m</div>
                        <div className="font-semibold text-orange">
                          <E value={kpi.target_12m} onChange={(v) => updateKpi(key, i, 'target_12m', v)} />
                        </div>
                      </div>
                    )}
                  </div>
                  {kpi.benchmark && (
                    <div className="text-xs text-ink3 mt-2">
                      <strong>Benchmark :</strong>{' '}
                      <E value={kpi.benchmark} onChange={(v) => updateKpi(key, i, 'benchmark', v)} />
                    </div>
                  )}
                  {kpi.frequency && (
                    <div className="text-xs mt-1">
                      <span className="badge bg-paper2">{kpi.frequency}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
