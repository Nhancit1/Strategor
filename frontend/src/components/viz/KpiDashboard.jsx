const CATEGORIES = [
  { key: 'financial', label: '💰 Financier', color: 'text-orange' },
  { key: 'customer', label: '🛒 Client', color: 'text-blue' },
  { key: 'process', label: '⚙️ Processus', color: 'text-green' },
  { key: 'learning', label: '🎓 Apprentissage', color: 'text-orangeDark' },
];

export default function KpiDashboard({ output }) {
  if (!output) return null;
  return (
    <div className="space-y-6">
      {output.north_star_metric && (
        <div className="card p-4 bg-orange/5 border-orange/30 text-center">
          <div className="text-xs text-orangeDark uppercase tracking-wide">⭐ North Star Metric</div>
          <div className="font-title text-xl font-bold mt-1">{output.north_star_metric}</div>
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
                  <div className="font-title font-semibold text-sm mb-1">{kpi.name}</div>
                  <div className="text-xs text-ink3 mb-2">{kpi.definition}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {kpi.current_value && (
                      <div>
                        <div className="text-ink3">Actuel</div>
                        <div className="font-semibold">{kpi.current_value}</div>
                      </div>
                    )}
                    {kpi.target_12m && (
                      <div>
                        <div className="text-ink3">Cible 12m</div>
                        <div className="font-semibold text-orange">{kpi.target_12m}</div>
                      </div>
                    )}
                  </div>
                  {kpi.benchmark && (
                    <div className="text-xs text-ink3 mt-2">
                      <strong>Benchmark :</strong> {kpi.benchmark}
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
