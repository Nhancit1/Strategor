import EditableText from './EditableText';

const PERF_BADGE = {
  HIGH: 'bg-green text-white',
  MEDIUM: 'bg-orange text-white',
  LOW: 'bg-red-600 text-white',
};
const IMP_BADGE = {
  HIGH: '⚡⚡⚡',
  MEDIUM: '⚡⚡',
  LOW: '⚡',
};

function ActivityCard({ activity, editing, onChange }) {


  return (
    <div className="card p-3 hover:shadow-cardHover transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-title font-semibold text-sm">
          <EditableText value={activity.name} onChange={editing ? (v) => onChange('name', v) : undefined} />
        </span>
        <span className="text-xs">{IMP_BADGE[activity.importance] || ''}</span>
      </div>
      {activity.performance && (
        <span className={`badge text-xs ${PERF_BADGE[activity.performance]}`}>
          Perf : {activity.performance}
        </span>
      )}
      {activity.improvements?.length > 0 && (
        <div className="mt-2 text-xs">
          <strong>À améliorer :</strong>
          <ul className="list-disc list-inside text-ink3 mt-1">
            {activity.improvements.map((imp, i) => (
              <li key={i}>
                <EditableText
                  value={imp}
                  onChange={editing ? (v) => {
                    const arr = [...activity.improvements];
                    arr[i] = v;
                    onChange('improvements', arr);
                  } : undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ValueChainDiagram({ output, editing, onOutputChange }) {
  if (!output) return null;

  const updateActivity = (type, index, field, value) => {
    const clone = structuredClone(output);
    clone[type][index][field] = value;
    onOutputChange?.(clone);
  };

  const updateImprovement = (index, value) => {
    const clone = structuredClone(output);
    clone.priority_improvements[index] = value;
    onOutputChange?.(clone);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-title font-semibold text-lg mb-3">📦 Activités primaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {(output.primary_activities || []).map((a, i) => (
            <ActivityCard
              key={i}
              activity={a}
              editing={editing}
              onChange={(field, v) => updateActivity('primary_activities', i, field, v)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-title font-semibold text-lg mb-3">🛠️ Activités de support</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {(output.support_activities || []).map((a, i) => (
            <ActivityCard
              key={i}
              activity={a}
              editing={editing}
              onChange={(field, v) => updateActivity('support_activities', i, field, v)}
            />
          ))}
        </div>
      </div>

      {output.priority_improvements?.length > 0 && (
        <div className="card p-4 bg-orange/5 border-orange/30">
          <h4 className="font-title font-semibold mb-2">🎯 Maillons à muscler en priorité</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.priority_improvements.map((p, i) => (
              <li key={i}>
                <EditableText
                  value={p}
                  onChange={editing ? (v) => updateImprovement(i, v) : undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
