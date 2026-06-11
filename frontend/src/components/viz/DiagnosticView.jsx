import EditableText from './EditableText';

const URGENCY_BG = {
  GREEN: 'bg-green/10 border-green/30 text-green',
  AMBER: 'bg-orange/10 border-orange/30 text-orangeDark',
  RED: 'bg-red-50 border-red-200 text-red-700',
};

const SEVERITY_COLOR = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange/10 text-orangeDark',
  MEDIUM: 'bg-paper2 text-ink2',
  LOW: 'bg-paper2 text-ink3',
};

/** Normalize a value that may be an array, a comma-string, or undefined → always an array */
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Normalize a value that may be an array of objects or a plain string → always an array of objects */
function toObjectArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(/\n+/).filter(Boolean).map((s) => ({ title: s, description: '' }));
  return [];
}

export default function DiagnosticView({ output, editing, onOutputChange }) {
  if (!output) return null;

  const coreStrengths = toArray(output.core_strengths);
  const faultLines = toObjectArray(output.fault_lines);
  const opportunityWindows = toObjectArray(output.opportunity_windows);

  const update = (key, value) => {
    onOutputChange?.({ ...output, [key]: value });
  };

  const updateStrength = (index, value) => {
    const arr = [...coreStrengths];
    arr[index] = value;
    update('core_strengths', arr);
  };

  const updateFaultLine = (index, field, value) => {
    const clone = structuredClone(output);
    const arr = toObjectArray(clone.fault_lines);
    arr[index][field] = value;
    clone.fault_lines = arr;
    onOutputChange?.(clone);
  };

  const updateOpportunity = (index, field, value) => {
    const clone = structuredClone(output);
    const arr = toObjectArray(clone.opportunity_windows);
    arr[index][field] = value;
    clone.opportunity_windows = arr;
    onOutputChange?.(clone);
  };

  const E = ({ value, onChange, multiline }) => (
    <EditableText value={value} onChange={editing ? onChange : undefined} multiline={multiline} />
  );

  return (
    <div className="space-y-6">
      {output.urgency_level && (
        <div className={`card p-4 border-2 ${URGENCY_BG[output.urgency_level] || ''}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {output.urgency_level === 'GREEN' ? '✅' : output.urgency_level === 'AMBER' ? '⚠️' : '🚨'}
            </span>
            <div>
              <div className="font-title font-bold text-lg">
                Niveau {output.urgency_level}
              </div>
              <p className="text-sm mt-1">
                <E value={output.ceo_verdict} onChange={(v) => update('ceo_verdict', v)} multiline />
              </p>
            </div>
          </div>
        </div>
      )}

      {output.position && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">📍 Position stratégique</h4>
          <p className="text-sm">
            <E value={output.position} onChange={(v) => update('position', v)} multiline />
          </p>
        </div>
      )}

      {coreStrengths.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-green">💪 Triangle des forces</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {coreStrengths.map((s, i) => (
              <li key={i}>
                <E
                  value={typeof s === 'string' ? s : JSON.stringify(s)}
                  onChange={(v) => updateStrength(i, v)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {faultLines.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-red-700">⚠️ Lignes de faille</h4>
          <div className="space-y-2">
            {faultLines.map((f, i) => (
              <div key={i} className="border border-paper3 p-3 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm">
                    <E value={f.title || f} onChange={(v) => updateFaultLine(i, 'title', v)} />
                  </strong>
                  {f.severity && (
                    <span className={`badge ${SEVERITY_COLOR[f.severity] || 'bg-paper2 text-ink2'}`}>{f.severity}</span>
                  )}
                </div>
                {f.description && (
                  <p className="text-xs text-ink3 mt-1">
                    <E value={f.description} onChange={(v) => updateFaultLine(i, 'description', v)} multiline />
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {opportunityWindows.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-blue">🌟 Fenêtres d'opportunité</h4>
          <div className="space-y-2">
            {opportunityWindows.map((o, i) => (
              <div key={i} className="border border-paper3 p-3 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm">
                    <E value={o.title || o} onChange={(v) => updateOpportunity(i, 'title', v)} />
                  </strong>
                  {o.deadline_months && (
                    <span className="badge bg-blue/10 text-blue">⏱ {o.deadline_months}m</span>
                  )}
                </div>
                {o.rationale && (
                  <p className="text-xs text-ink3 mt-1">
                    <E value={o.rationale} onChange={(v) => updateOpportunity(i, 'rationale', v)} multiline />
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
