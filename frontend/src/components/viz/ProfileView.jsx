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



  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h4 className="font-title font-semibold mb-2">📍 Activité</h4>
        <p className="text-sm">
          <EditableText value={output.activity} onChange={editing ? (v) => update('activity', v) : undefined} multiline />
        </p>
      </div>
      {output.clientele && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">🎯 Clientèle</h4>
          <p className="text-sm">
            <EditableText value={output.clientele} onChange={editing ? (v) => update('clientele', v) : undefined} multiline />
          </p>
        </div>
      )}
      {output.positioning && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">📌 Positionnement</h4>
          <p className="text-sm">
            <EditableText value={output.positioning} onChange={editing ? (v) => update('positioning', v) : undefined} multiline />
          </p>
        </div>
      )}
      {output.initial_strengths?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-green">💪 Atouts initiaux</h4>
          <ul className="list-disc list-inside text-sm">
            {output.initial_strengths.map((s, i) => (
              <li key={i}>
                <EditableText value={s} onChange={editing ? (v) => updateArrayItem('initial_strengths', i, v) : undefined} />
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
                <EditableText value={c} onChange={editing ? (v) => updateArrayItem('key_challenges', i, v) : undefined} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {output.synthesis && (
        <div className="card p-4 bg-paper2">
          <h4 className="font-title font-semibold mb-2">📝 Synthèse</h4>
          <p className="text-sm whitespace-pre-line">
            <EditableText value={output.synthesis} onChange={editing ? (v) => update('synthesis', v) : undefined} multiline />
          </p>
        </div>
      )}
    </div>
  );
}
