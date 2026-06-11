// Severity = probability × impact, mapped to brand colors (no out-of-palette colors).
const sevClass = (p, i) => {
  const s = (p || 0) * (i || 0);
  if (s >= 15) return 'bg-red-600 text-white';
  if (s >= 8) return 'bg-orange text-white';
  return 'bg-paper3 text-ink';
};

export default function RiskMatrix({ output }) {
  if (!output) return null;
  const risks = output.risks || [];

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <h3 className="font-title font-semibold text-lg mb-4">Registre des risques</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink3 border-b border-paper3">
                <th className="py-2 pr-3">Risque</th>
                <th className="py-2 px-2">Catégorie</th>
                <th className="py-2 px-2 text-center">Prob.</th>
                <th className="py-2 px-2 text-center">Impact</th>
                <th className="py-2 px-2 text-center">Score</th>
                <th className="py-2 pl-3">Mitigation</th>
                <th className="py-2 pl-3">Responsable</th>
                <th className="py-2 pl-3">Horizon</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r, i) => (
                <tr key={i} className="border-b border-paper2 align-top">
                  <td className="py-2 pr-3 font-medium">{r.name}</td>
                  <td className="py-2 px-2 text-ink3">{r.category}</td>
                  <td className="py-2 px-2 text-center">{r.probability}</td>
                  <td className="py-2 px-2 text-center">{r.impact}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${sevClass(r.probability, r.impact)}`}>
                      {(r.probability || 0) * (r.impact || 0)}
                    </span>
                  </td>
                  <td className="py-2 pl-3">{r.mitigation}</td>
                  <td className="py-2 pl-3 text-ink3">{r.owner}</td>
                  <td className="py-2 pl-3 text-ink3">{r.horizon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {output.synthesis && (
        <div className="card p-4 bg-orange/5 border-orange/30">
          <h4 className="font-title font-semibold mb-1">🎯 Risques prioritaires</h4>
          <p className="text-sm">{output.synthesis}</p>
        </div>
      )}
    </div>
  );
}
