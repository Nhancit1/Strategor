import EditableText from './EditableText';

const QUADRANTS = [
  { key: 'strengths', label: '💪 Forces', color: 'bg-green/5 border-green/30', textColor: 'text-green' },
  { key: 'weaknesses', label: '🔍 Faiblesses', color: 'bg-red-50 border-red-200', textColor: 'text-red-700' },
  { key: 'opportunities', label: '🌟 Opportunités', color: 'bg-blue/5 border-blue/30', textColor: 'text-blue' },
  { key: 'threats', label: '⚠️ Menaces', color: 'bg-orange/5 border-orange/30', textColor: 'text-orangeDark' },
];

const PRIORITY_BADGE = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange/10 text-orangeDark',
  LOW: 'bg-paper2 text-ink3',
};

export default function SwotMatrix({ output, editing, onOutputChange }) {
  if (!output) return null;

  const updateItem = (quadrant, index, field, value) => {
    const clone = structuredClone(output);
    clone[quadrant][index][field] = value;
    onOutputChange?.(clone);
  };

  const updateTowsAction = (index, field, value) => {
    const clone = structuredClone(output);
    clone.tows_actions[index][field] = value;
    onOutputChange?.(clone);
  };



  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map((q) => {
          const items = output[q.key] || [];
          return (
            <div key={q.key} className={`border-2 rounded-xl p-4 ${q.color}`}>
              <h3 className={`font-title font-semibold text-lg mb-3 ${q.textColor}`}>{q.label}</h3>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="bg-white p-2 rounded-lg border border-paper3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">
                        <EditableText value={item.title} onChange={editing ? (v) => updateItem(q.key, i, 'title', v) : undefined} />
                      </span>
                      {item.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[item.priority]}`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-ink3 mt-1">
                        <EditableText value={item.description} onChange={editing ? (v) => updateItem(q.key, i, 'description', v) : undefined} multiline />
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {output.tows_actions?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-3">🎯 Actions TOWS</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {output.tows_actions.map((a, i) => (
              <div key={i} className="border border-paper3 p-3 rounded-lg">
                <span className="badge-validated mb-1">{a.type}</span>
                <div className="font-semibold text-sm mt-1">
                  <EditableText value={a.action} onChange={editing ? (v) => updateTowsAction(i, 'action', v) : undefined} />
                </div>
                {a.rationale && (
                  <p className="text-xs text-ink3 mt-1">
                    <EditableText value={a.rationale} onChange={editing ? (v) => updateTowsAction(i, 'rationale', v) : undefined} multiline />
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
