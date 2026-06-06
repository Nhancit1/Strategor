export default function ProfileView({ output }) {
  if (!output) return null;
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h4 className="font-title font-semibold mb-2">📍 Activité</h4>
        <p className="text-sm">{output.activity}</p>
      </div>
      {output.clientele && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">🎯 Clientèle</h4>
          <p className="text-sm">{output.clientele}</p>
        </div>
      )}
      {output.positioning && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2">📌 Positionnement</h4>
          <p className="text-sm">{output.positioning}</p>
        </div>
      )}
      {output.initial_strengths?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-green">💪 Atouts initiaux</h4>
          <ul className="list-disc list-inside text-sm">{output.initial_strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {output.key_challenges?.length > 0 && (
        <div className="card p-4">
          <h4 className="font-title font-semibold mb-2 text-orangeDark">⚠️ Enjeux clés</h4>
          <ul className="list-disc list-inside text-sm">{output.key_challenges.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      )}
      {output.synthesis && (
        <div className="card p-4 bg-paper2">
          <h4 className="font-title font-semibold mb-2">📝 Synthèse</h4>
          <p className="text-sm whitespace-pre-line">{output.synthesis}</p>
        </div>
      )}
    </div>
  );
}
