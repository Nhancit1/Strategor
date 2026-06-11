import EditableText from './EditableText';

const FORCES = [
  { key: 'rivalry', label: 'Rivalité', emoji: '⚔️' },
  { key: 'new_entrants', label: 'Nouveaux entrants', emoji: '🚪' },
  { key: 'substitutes', label: 'Substituts', emoji: '🔄' },
  { key: 'suppliers', label: 'Fournisseurs', emoji: '📦' },
  { key: 'buyers', label: 'Clients', emoji: '🛒' },
];

const INTENSITY_COLOR = {
  LOW: 'bg-green/10 text-green border-green/30',
  MEDIUM: 'bg-orange/10 text-orangeDark border-orange/30',
  HIGH: 'bg-red-50 text-red-700 border-red-200',
};

export default function PorterPentagon({ output, editing, onOutputChange }) {
  if (!output) return null;

  const updateForce = (forceKey, field, value) => {
    const clone = structuredClone(output);
    clone[forceKey][field] = value;
    onOutputChange?.(clone);
  };

  const updateLever = (index, value) => {
    const clone = structuredClone(output);
    clone.key_levers[index] = value;
    onOutputChange?.(clone);
  };

  const E = ({ value, onChange, multiline }) => (
    <EditableText value={value} onChange={editing ? onChange : undefined} multiline={multiline} />
  );

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-title text-xl font-semibold">5 Forces de Porter</h3>
        {output.overall_attractiveness && (
          <p className="text-sm text-ink3 mt-1">
            Attractivité du marché :
            <span className="font-bold ml-2">{output.overall_attractiveness}/5</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {FORCES.map(({ key, label, emoji }) => {
          const force = output[key];
          if (!force) return null;
          return (
            <div key={key} className={`card p-4 border-2 ${INTENSITY_COLOR[force.intensity] || ''}`}>
              <div className="text-3xl text-center mb-2">{emoji}</div>
              <div className="font-title font-semibold text-sm text-center mb-2">{label}</div>
              <div className="text-center text-2xl font-bold mb-2">{force.score}/5</div>
              <div className="text-xs text-center mb-2">
                <span className="badge">{force.intensity}</span>
                {force.trend && (
                  <span className="ml-1">
                    {force.trend === 'INCREASING' ? '↗' : force.trend === 'DECREASING' ? '↘' : '→'}
                  </span>
                )}
              </div>
              <p className="text-xs">
                <E value={force.rationale} onChange={(v) => updateForce(key, 'rationale', v)} multiline />
              </p>
            </div>
          );
        })}
      </div>

      {output.key_levers?.length > 0 && (
        <div className="card p-4 mt-4">
          <h4 className="font-title font-semibold mb-2">🛠️ Leviers prioritaires</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {output.key_levers.map((l, i) => (
              <li key={i}>
                <E value={l} onChange={(v) => updateLever(i, v)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
