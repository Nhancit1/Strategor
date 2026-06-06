const TYPE_COLORS = {
  LEADER: { dot: 'bg-blue text-white', border: 'border-blue' },
  CHALLENGER: { dot: 'bg-orange text-white', border: 'border-orange' },
  DISRUPTOR: { dot: 'bg-red-600 text-white', border: 'border-red-600' },
  NICHE: { dot: 'bg-paper3 text-ink border border-ink3', border: 'border-ink3' },
};

// No longer using fixed normalization. We will auto-scale based on the dataset bounds.

export default function CompetitiveMap({ output }) {
  if (!output) return null;
  const competitors = output.competitors || [];
  const axes = output.axes || { x_label: 'Axe X', y_label: 'Axe Y' };

  // Calculate bounds to auto-scale coordinates and prevent clustering
  const xValues = competitors.map(c => typeof c.x_axis === 'number' ? c.x_axis : 50);
  const yValues = competitors.map(c => typeof c.y_axis === 'number' ? c.y_axis : 50);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const scale = (val, min, max) => {
    if (typeof val !== 'number' || isNaN(val)) return 50;
    if (max === min) return 50;
    // Map to 10% - 90% range to avoid clipping at the very edges
    return ((val - min) / (max - min)) * 80 + 10;
  };

  return (
    <div className="space-y-6">
      {/* 2D map */}
      <div className="card p-4">
        <h3 className="font-title font-semibold text-lg mb-4">Cartographie concurrentielle</h3>

        {/* Axis labels */}
        <div className="flex items-center gap-4">
          {/* Y-axis label — vertical, sitting left of the map */}
          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 24 }}>
            <span
              className="text-xs text-ink3 font-medium whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              ↑ {axes.y_label}
            </span>
          </div>

          <div className="flex-1">
            <div className="relative w-full bg-paper2 rounded-lg border-2 border-paper3" style={{ paddingBottom: '75%' }}>
              {/* Grid lines */}
              <div className="absolute inset-0">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-ink3/30" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-ink3/30" />
              </div>

              {/* Quadrant labels */}
              <span className="absolute top-2 left-3 text-[10px] text-ink3/50 select-none">↑ Haut</span>
              <span className="absolute bottom-2 right-3 text-[10px] text-ink3/50 select-none">Bas ↓</span>

              {/* Competitor dots */}
              {competitors.map((c, i) => {
                const x = scale(c.x_axis, minX, maxX);
                const y = 100 - scale(c.y_axis, minY, maxY); // invert Y so high = top
                const colors = TYPE_COLORS[c.type] || TYPE_COLORS.NICHE;
                return (
                  <div
                    key={i}
                    className="absolute group"
                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-semibold shadow-card cursor-default ${colors.dot}`}
                    >
                      {c.name}
                    </div>
                    {/* Hover tooltip */}
                    <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-ink text-white text-xs p-2 rounded shadow-cardHover z-20 w-52">
                      <p className="font-semibold mb-1">{c.name}</p>
                      <p>{c.positioning}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis label below the map */}
            <p className="text-xs text-ink3 text-right mt-1">{axes.x_label} →</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(TYPE_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <span className={`inline-block w-3 h-3 rounded-full ${colors.dot}`} />
              <span className="text-ink3">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed list */}
      <div className="space-y-2">
        {competitors.map((c, i) => {
          const colors = TYPE_COLORS[c.type] || TYPE_COLORS.NICHE;
          return (
            <div key={i} className="card p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="font-title font-semibold">{c.name}</span>
                  <span className={`badge ml-2 ${colors.dot}`}>{c.type}</span>
                </div>
              </div>
              <p className="text-sm text-ink3 mb-2">{c.positioning}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {c.strengths?.length > 0 && (
                  <div>
                    <strong className="text-green">Forces :</strong>
                    <ul className="list-disc list-inside mt-1">
                      {c.strengths.map((s, j) => <li key={j}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {c.weaknesses?.length > 0 && (
                  <div>
                    <strong className="text-red-600">Faiblesses :</strong>
                    <ul className="list-disc list-inside mt-1">
                      {c.weaknesses.map((w, j) => <li key={j}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              {c.recent_signals && (
                <p className="text-xs text-ink3 mt-2"><strong>Signaux :</strong> {c.recent_signals}</p>
              )}
            </div>
          );
        })}
      </div>

      {output.differentiation_angles?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">🔀 Axes de différenciation</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.differentiation_angles.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {output.positioning_recommendation && (
        <div className="card p-4 bg-orange/5 border-orange/30">
          <h4 className="font-title font-semibold mb-1">🎯 Recommandation</h4>
          <p className="text-sm">{output.positioning_recommendation}</p>
        </div>
      )}
    </div>
  );
}
