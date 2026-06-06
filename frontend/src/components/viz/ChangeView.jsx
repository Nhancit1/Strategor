const SUPPORT_BADGE = {
  CHAMPION: 'bg-green text-white',
  SUPPORTER: 'bg-green/20 text-green',
  NEUTRAL: 'bg-paper3 text-ink2',
  RESISTANT: 'bg-orange/20 text-orangeDark',
  BLOCKER: 'bg-red-600 text-white',
};

const INFLUENCE_LABEL = {
  HIGH: '↑↑↑',
  MEDIUM: '↑↑',
  LOW: '↑',
};

export default function ChangeView({ output }) {
  if (!output) return null;
  return (
    <div className="space-y-6">
      {output.stakeholders?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-title font-semibold text-lg mb-3">👥 Parties prenantes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink3">
                <tr><th className="text-left p-2">Nom</th><th>Rôle</th><th>Influence</th><th>Posture</th><th className="text-left">Action</th></tr>
              </thead>
              <tbody>
                {output.stakeholders.map((s, i) => (
                  <tr key={i} className="border-t border-paper2">
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2 text-ink3">{s.role}</td>
                    <td className="p-2 text-center">{INFLUENCE_LABEL[s.influence]}</td>
                    <td className="p-2 text-center"><span className={`badge ${SUPPORT_BADGE[s.support]}`}>{s.support}</span></td>
                    <td className="p-2 text-xs text-ink3">{s.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {output.raci?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-title font-semibold text-lg mb-3">📋 RACI</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink3">
                <tr><th className="text-left p-2">Action</th><th>R</th><th>A</th><th>C</th><th>I</th></tr>
              </thead>
              <tbody>
                {output.raci.map((r, i) => (
                  <tr key={i} className="border-t border-paper2">
                    <td className="p-2 font-medium">{r.action}</td>
                    <td className="p-2 text-center text-xs">{r.responsible}</td>
                    <td className="p-2 text-center text-xs">{r.accountable}</td>
                    <td className="p-2 text-center text-xs">{r.consulted}</td>
                    <td className="p-2 text-center text-xs">{r.informed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {output.communication_plan?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-title font-semibold text-lg mb-3">📢 Plan de communication</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {output.communication_plan.map((c, i) => (
              <div key={i} className="border border-paper3 p-3 rounded-lg">
                <div className="font-medium text-sm">{c.message}</div>
                <div className="text-xs text-ink3 mt-1">
                  → {c.audience} via {c.channel} · {c.timing}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {output.month_one_quick_wins?.length > 0 && (
        <div className="card p-4 bg-green/5 border-green/30">
          <h4 className="font-title font-semibold mb-2 text-green">⚡ Quick wins mois 1</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.month_one_quick_wins.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
