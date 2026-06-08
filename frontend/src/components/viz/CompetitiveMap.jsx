import ReactECharts from 'echarts-for-react';

const TYPES = {
  LEADER:     { color: '#6366F1', bg: 'bg-indigo-100 text-indigo-700' },
  CHALLENGER: { color: '#F97316', bg: 'bg-orange-100 text-orange-700' },
  DISRUPTOR:  { color: '#EF4444', bg: 'bg-red-100 text-red-700' },
  NICHE:      { color: '#8B5CF6', bg: 'bg-violet-100 text-violet-700' },
};
const SUBJECT_COLOR = '#F97316';

export default function CompetitiveMap({ output }) {
  if (!output) return null;

  const competitors = output.competitors || [];
  const axes = output.axes || { x_label: 'Price', y_label: 'Perceived Value' };
  const sub = output.subject_position;

  // Group competitors by type
  const typeGroups = {};
  competitors.forEach((c) => {
    const type = c.type || 'NICHE';
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push({
      value: [Number(c.x_axis) || 5, Number(c.y_axis) || 5],
      name: c.name,
      positioning: c.positioning || '',
    });
  });

  const competitorSeries = Object.entries(typeGroups).map(([type, data]) => ({
    name: type,
    type: 'scatter',
    symbolSize: 16,
    itemStyle: {
      color: TYPES[type]?.color || '#8B5CF6',
      shadowBlur: 8,
      shadowColor: (TYPES[type]?.color || '#8B5CF6') + '55',
    },
    label: {
      show: true,
      formatter: (p) => p.data.name,
      position: 'right',
      fontSize: 11,
      fontFamily: 'Inter, sans-serif',
      color: '#374151',
    },
    // emphasis: { scale: 1.5 },
    data,
    tooltip: {
      formatter: (p) =>
        `<div style="font-weight:600;margin-bottom:4px;white-space:normal">${p.data.name}</div>
         <div style="color:#9CA3AF;font-size:11px;white-space:normal;line-height:1.5">${p.data.positioning}</div>`,
    },
  }));

  const subjectSeries = sub
    ? [{
        name: 'Your Company',
        type: 'scatter',
        symbol: 'pin',
        symbolSize: 42,
        itemStyle: {
          color: SUBJECT_COLOR,
          shadowBlur: 20,
          shadowColor: SUBJECT_COLOR + '88',
        },
        label: {
          show: true,
          formatter: 'Your Company',
          position: 'right',
          fontSize: 12,
          fontWeight: 'bold',
          fontFamily: 'Inter, sans-serif',
          color: SUBJECT_COLOR,
        },
        data: [{
          value: [Number(sub.x_axis), Number(sub.y_axis)],
          name: 'Your Company',
          positioning: sub.summary || '',
        }],
        tooltip: {
          formatter: (p) =>
            `<div style="font-weight:600;margin-bottom:4px;white-space:normal">★ Your Company</div>
             <div style="color:#9CA3AF;font-size:11px;white-space:normal;line-height:1.5">${p.data.positioning}</div>`,
        },
        z: 20,
      }]
    : [];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#1F2937',
      borderColor: '#374151',
      borderRadius: 10,
      padding: [10, 14],
      textStyle: { color: '#F9FAFB', fontSize: 12 },
      extraCssText: 'box-shadow: 0 10px 25px rgba(0,0,0,0.25); max-width: 220px; white-space: normal; word-break: break-word;',
    },
    legend: {
      top: 8,
      right: 8,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: '#6B7280', fontFamily: 'Inter, sans-serif' },
      data: [
        ...Object.keys(typeGroups),
        ...(sub ? ['Your Company'] : []),
      ],
    },
    grid: { left: 56, right: 32, top: 48, bottom: 56, containLabel: false },
    xAxis: {
      min: 0,
      max: 10,
      name: axes.x_label,
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter, sans-serif' },
      splitLine: { lineStyle: { type: 'dashed', color: '#F3F4F6', width: 1.5 } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#D1D5DB', fontSize: 10 },
    },
    yAxis: {
      min: 0,
      max: 10,
      name: axes.y_label,
      nameLocation: 'middle',
      nameGap: 42,
      nameTextStyle: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter, sans-serif' },
      splitLine: { lineStyle: { type: 'dashed', color: '#F3F4F6', width: 1.5 } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#D1D5DB', fontSize: 10 },
    },
    series: [...competitorSeries, ...subjectSeries],
  };

  return (
    <div className="space-y-5">

      {/* ── ECharts scatter map ─────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-base text-slate-800 mb-1">Competitive Landscape</h3>
        <p className="text-xs text-slate-400 mb-4">Positioning of key players on 2 strategic axes</p>
        <ReactECharts option={option} style={{ height: 440 }} notMerge lazyUpdate />
      </div>

      {/* ── Your positioning summary ──────────── */}
      {sub?.summary && (
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-5 flex gap-4 items-start">
          <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg flex-shrink-0">★</div>
          <div>
            <p className="font-semibold text-orange-700 text-sm mb-1">Your Positioning</p>
            <p className="text-sm text-slate-600 leading-relaxed">{sub.summary}</p>
          </div>
        </div>
      )}

      {/* ── Competitor cards ───────────────────── */}
      <div>
        <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-3">Competitor Profiles</h4>
        <div className="grid gap-3">
          {competitors.map((c, i) => {
            const t = TYPES[c.type] || TYPES.NICHE;
            return (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold" style={{ color: t.color }}>{c.name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${t.bg}`}>{c.type}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{c.positioning}</p>
                <div className="grid grid-cols-2 gap-3">
                  {c.strengths?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-1">✓ Strengths</p>
                      <ul className="space-y-0.5">
                        {c.strengths.map((s, j) => (
                          <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                            <span className="text-emerald-400 mt-0.5">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.weaknesses?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500 mb-1">✗ Weaknesses</p>
                      <ul className="space-y-0.5">
                        {c.weaknesses.map((w, j) => (
                          <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                            <span className="text-red-300 mt-0.5">•</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {c.recent_signals && (
                  <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-50">
                    <span className="font-medium text-slate-500">Signal: </span>{c.recent_signals}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Head-to-head comparison ────────────── */}
      {output.comparison?.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-3">Head-to-Head Comparison</h4>
          <div className="grid gap-3">
            {output.comparison.map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="font-semibold text-slate-800 mb-3">
                  <span className="text-orange-500">You</span> vs <span>{c.competitor}</span>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {c.our_advantages?.length > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-2">Your Advantages</p>
                      <ul className="space-y-1">
                        {c.our_advantages.map((a, j) => (
                          <li key={j} className="text-xs text-slate-700 flex gap-1.5">
                            <span className="text-emerald-500">✓</span>{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.our_gaps?.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-red-500 mb-2">Your Gaps</p>
                      <ul className="space-y-1">
                        {c.our_gaps.map((g, j) => (
                          <li key={j} className="text-xs text-slate-700 flex gap-1.5">
                            <span className="text-red-400">✗</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {c.verdict && (
                  <p className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Verdict: </span>{c.verdict}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Differentiation angles ─────────────── */}
      {output.differentiation_angles?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h4 className="font-semibold text-slate-800 mb-3">🔀 Differentiation Angles</h4>
          <div className="flex flex-wrap gap-2">
            {output.differentiation_angles.map((a, i) => (
              <span key={i} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full border border-indigo-100">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommendation ────────────────────── */}
      {output.positioning_recommendation && (
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5">
          <div className="flex gap-3 items-start">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-semibold text-orange-700 mb-1">Strategic Recommendation</p>
              <p className="text-sm text-slate-700 leading-relaxed">{output.positioning_recommendation}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
