function Section({ title, children }) {
  return (
    <div className="card p-4">
      <h3 className="font-title font-semibold text-lg mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function FinanceScenarios({ output }) {
  if (!output) return null;
  const sensitivity = output.sensitivity || [];
  const scenarios = output.scenarios || [];
  const costing = output.axis_costing || [];

  return (
    <div className="space-y-6">
      {scenarios.length > 0 && (
        <Section title="Scénarios">
          <div className="grid md:grid-cols-3 gap-3">
            {scenarios.map((s, i) => (
              <div key={i} className="border border-paper3 rounded-lg p-3">
                <div className="font-title font-semibold mb-1">{s.name}</div>
                {s.assumptions?.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-ink3 mb-2">
                    {s.assumptions.map((a, j) => <li key={j}>{a}</li>)}
                  </ul>
                )}
                <p className="text-sm"><strong>CA :</strong> {s.revenue_effect}</p>
                <p className="text-sm"><strong>Marge :</strong> {s.margin_effect}</p>
                {s.comment && <p className="text-xs text-ink3 mt-1">{s.comment}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {sensitivity.length > 0 && (
        <Section title="Analyse de sensibilité">
          <div className="space-y-2">
            {sensitivity.map((r, i) => (
              <div key={i} className="flex flex-wrap gap-x-3 text-sm border-b border-paper2 pb-2">
                <span className="font-medium">{r.variable}</span>
                <span className="text-orange-dark font-medium">{r.change}</span>
                <span>→ {r.impact_on_margin}</span>
                {r.comment && <span className="text-ink3 text-xs w-full">{r.comment}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {costing.length > 0 && (
        <Section title="Chiffrage des axes">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink3 border-b border-paper3">
                  <th className="py-2 pr-3">Axe</th>
                  <th className="py-2 px-2">Investissement</th>
                  <th className="py-2 px-2">Gain attendu</th>
                  <th className="py-2 pl-3">Payback</th>
                </tr>
              </thead>
              <tbody>
                {costing.map((c, i) => (
                  <tr key={i} className="border-b border-paper2 align-top">
                    <td className="py-2 pr-3 font-medium">{c.axis}</td>
                    <td className="py-2 px-2">{c.investment}</td>
                    <td className="py-2 px-2">{c.expected_gain}</td>
                    <td className="py-2 pl-3">{c.payback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {output.synthesis && (
        <div className="card p-4 bg-orange/5 border-orange/30">
          <h4 className="font-title font-semibold mb-1">🎯 Synthèse financière</h4>
          <p className="text-sm">{output.synthesis}</p>
        </div>
      )}
    </div>
  );
}
