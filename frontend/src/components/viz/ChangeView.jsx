import EditableText from './EditableText';

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

export default function ChangeView({ output, editing, onOutputChange }) {
  if (!output) return null;

  const updateStakeholder = (index, field, value) => {
    const clone = structuredClone(output);
    clone.stakeholders[index][field] = value;
    onOutputChange?.(clone);
  };

  const updateRaci = (index, field, value) => {
    const clone = structuredClone(output);
    clone.raci[index][field] = value;
    onOutputChange?.(clone);
  };

  const updateComm = (index, field, value) => {
    const clone = structuredClone(output);
    clone.communication_plan[index][field] = value;
    onOutputChange?.(clone);
  };

  const updateQuickWin = (index, value) => {
    const clone = structuredClone(output);
    clone.month_one_quick_wins[index] = value;
    onOutputChange?.(clone);
  };



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
                    <td className="p-2 font-medium">
                      <EditableText value={s.name} onChange={editing ? (v) => updateStakeholder(i, 'name', v) : undefined} />
                    </td>
                    <td className="p-2 text-ink3">
                      <EditableText value={s.role} onChange={editing ? (v) => updateStakeholder(i, 'role', v) : undefined} />
                    </td>
                    <td className="p-2 text-center">{INFLUENCE_LABEL[s.influence]}</td>
                    <td className="p-2 text-center"><span className={`badge ${SUPPORT_BADGE[s.support]}`}>{s.support}</span></td>
                    <td className="p-2 text-xs text-ink3">
                      <EditableText value={s.action} onChange={editing ? (v) => updateStakeholder(i, 'action', v) : undefined} />
                    </td>
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
                    <td className="p-2 font-medium">
                      <EditableText value={r.action} onChange={editing ? (v) => updateRaci(i, 'action', v) : undefined} />
                    </td>
                    <td className="p-2 text-center text-xs">
                      <EditableText value={r.responsible} onChange={editing ? (v) => updateRaci(i, 'responsible', v) : undefined} />
                    </td>
                    <td className="p-2 text-center text-xs">
                      <EditableText value={r.accountable} onChange={editing ? (v) => updateRaci(i, 'accountable', v) : undefined} />
                    </td>
                    <td className="p-2 text-center text-xs">
                      <EditableText value={r.consulted} onChange={editing ? (v) => updateRaci(i, 'consulted', v) : undefined} />
                    </td>
                    <td className="p-2 text-center text-xs">
                      <EditableText value={r.informed} onChange={editing ? (v) => updateRaci(i, 'informed', v) : undefined} />
                    </td>
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
                <div className="font-medium text-sm">
                  <EditableText value={c.message} onChange={editing ? (v) => updateComm(i, 'message', v) : undefined} />
                </div>
                <div className="text-xs text-ink3 mt-1">
                  → <EditableText value={c.audience} onChange={editing ? (v) => updateComm(i, 'audience', v) : undefined} />
                  {' '}via <EditableText value={c.channel} onChange={editing ? (v) => updateComm(i, 'channel', v) : undefined} />
                  {' '}· <EditableText value={c.timing} onChange={editing ? (v) => updateComm(i, 'timing', v) : undefined} />
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
            {output.month_one_quick_wins.map((w, i) => (
              <li key={i}>
                <EditableText value={w} onChange={editing ? (v) => updateQuickWin(i, v) : undefined} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
