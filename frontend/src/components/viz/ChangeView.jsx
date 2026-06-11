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

  const E = ({ value, onChange, multiline }) => (
    <EditableText value={value} onChange={editing ? onChange : undefined} multiline={multiline} />
  );

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
                      <E value={s.name} onChange={(v) => updateStakeholder(i, 'name', v)} />
                    </td>
                    <td className="p-2 text-ink3">
                      <E value={s.role} onChange={(v) => updateStakeholder(i, 'role', v)} />
                    </td>
                    <td className="p-2 text-center">{INFLUENCE_LABEL[s.influence]}</td>
                    <td className="p-2 text-center"><span className={`badge ${SUPPORT_BADGE[s.support]}`}>{s.support}</span></td>
                    <td className="p-2 text-xs text-ink3">
                      <E value={s.action} onChange={(v) => updateStakeholder(i, 'action', v)} />
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
                      <E value={r.action} onChange={(v) => updateRaci(i, 'action', v)} />
                    </td>
                    <td className="p-2 text-center text-xs">
                      <E value={r.responsible} onChange={(v) => updateRaci(i, 'responsible', v)} />
                    </td>
                    <td className="p-2 text-center text-xs">
                      <E value={r.accountable} onChange={(v) => updateRaci(i, 'accountable', v)} />
                    </td>
                    <td className="p-2 text-center text-xs">
                      <E value={r.consulted} onChange={(v) => updateRaci(i, 'consulted', v)} />
                    </td>
                    <td className="p-2 text-center text-xs">
                      <E value={r.informed} onChange={(v) => updateRaci(i, 'informed', v)} />
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
                  <E value={c.message} onChange={(v) => updateComm(i, 'message', v)} />
                </div>
                <div className="text-xs text-ink3 mt-1">
                  → <E value={c.audience} onChange={(v) => updateComm(i, 'audience', v)} />
                  {' '}via <E value={c.channel} onChange={(v) => updateComm(i, 'channel', v)} />
                  {' '}· <E value={c.timing} onChange={(v) => updateComm(i, 'timing', v)} />
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
                <E value={w} onChange={(v) => updateQuickWin(i, v)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
