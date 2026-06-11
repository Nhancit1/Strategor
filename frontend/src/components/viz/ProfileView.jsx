import EditableText from './EditableText';

export default function ProfileView({ output, editing, onOutputChange }) {
  if (!output) return null;

  const update = (key, value) => {
    onOutputChange?.({ ...output, [key]: value });
  };

  const updateArrayItem = (key, index, value) => {
    const arr = [...(output[key] || [])];
    arr[index] = value;
    onOutputChange?.({ ...output, [key]: arr });
  };

  const E = ({ value, onChange, multiline }) => (
    <EditableText value={value} onChange={editing ? onChange : undefined} multiline={multiline} />
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h4 className="font-title font-semibold mb-2">📍 Activité</h4>
        <p className="text-sm">
          <E value={output.activity} onChange={(v) => update('activity', v)} multiline />
        </p>
      </div>
      {output.clientele && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">🎯 Clientèle</h4>
          <p className="text-sm">
            <E value={output.clientele} onChange={(v) => update('clientele', v)} multiline />
          </p>
        </div>
      )}
      {output.positioning && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">📌 Positionnement</h4>
          <p className="text-sm">
            <E value={output.positioning} onChange={(v) => update('positioning', v)} multiline />
          </p>
        </div>
      )}
      {output.initial_strengths?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-green">💪 Atouts initiaux</h4>
          <ul className="list-disc list-inside text-sm">
            {output.initial_strengths.map((s, i) => (
              <li key={i}>
                <E value={s} onChange={(v) => updateArrayItem('initial_strengths', i, v)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {output.key_challenges?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-orangeDark">⚠️ Enjeux clés</h4>
          <ul className="list-disc list-inside text-sm">
            {output.key_challenges.map((c, i) => (
              <li key={i}>
                <E value={c} onChange={(v) => updateArrayItem('key_challenges', i, v)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {output.synthesis && (
        <div className="card p-4 bg-paper2">
          <h4 className="font-title font-semibold mb-2">📝 Synthèse</h4>
          <p className="text-sm whitespace-pre-line">
            <E value={output.synthesis} onChange={(v) => update('synthesis', v)} multiline />
          </p>
        </div>
      )}
    </div>
  );
}
