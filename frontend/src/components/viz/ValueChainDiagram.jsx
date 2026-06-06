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

function ActivityCard({ activity }) {
  return (
    <div className="card p-3 hover:shadow-cardHover transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-title font-semibold text-sm">{activity.name}</span>
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
            {activity.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ValueChainDiagram({ output }) {
  if (!output) return null;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-title font-semibold text-lg mb-3">📦 Activités primaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {(output.primary_activities || []).map((a, i) => <ActivityCard key={i} activity={a} />)}
        </div>
      </div>

      <div>
        <h3 className="font-title font-semibold text-lg mb-3">🛠️ Activités de support</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {(output.support_activities || []).map((a, i) => <ActivityCard key={i} activity={a} />)}
        </div>
      </div>

      {output.priority_improvements?.length > 0 && (
        <div className="card p-4 bg-orange/5 border-orange/30">
          <h4 className="font-title font-semibold mb-2">🎯 Maillons à muscler en priorité</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.priority_improvements.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
