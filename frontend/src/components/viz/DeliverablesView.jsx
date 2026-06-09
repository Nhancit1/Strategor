/** Safely render a value: if the AI returned an object instead of a string, JSON-stringify it */
function safeText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

export default function DeliverablesView({ output }) {
  const er = output?.executive_report;
  const deck = Array.isArray(output?.board_deck) ? output.board_deck : [];
  const plan = Array.isArray(output?.team_plan) ? output.team_plan : [];

  // If the output has none of the expected keys, show a raw fallback
  const hasContent = er || deck.length > 0 || plan.length > 0;

  if (!hasContent) {
    return (
      <div className="space-y-4">
        <p className="text-ink3 text-sm">
          L'agent a produit des données mais le format n'est pas reconnu. Voici le contenu brut :
        </p>
        <pre className="bg-paper2 p-4 rounded-lg text-xs overflow-auto max-h-[60vh]">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {er && (
        <div className="card p-5">
          <h3 className="font-title font-semibold text-lg mb-3 text-orange">📄 Rapport dirigeant</h3>
          {er.executive_summary && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1">Synthèse exécutive</h4>
              <p className="text-sm text-ink2 whitespace-pre-line">{safeText(er.executive_summary)}</p>
            </div>
          )}
          {er.strategic_analysis && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1">Analyse stratégique</h4>
              <p className="text-sm text-ink2 whitespace-pre-line">{safeText(er.strategic_analysis)}</p>
            </div>
          )}
          {er.recommendations?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1">Recommandations</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {er.recommendations.map((r, i) => <li key={i}>{safeText(r)}</li>)}
              </ul>
            </div>
          )}
          {er.action_plan_18m && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Plan 18 mois</h4>
              <p className="text-sm text-ink2 whitespace-pre-line">{safeText(er.action_plan_18m)}</p>
            </div>
          )}
        </div>
      )}

      {deck.length > 0 && (
        <div className="card p-5">
          <h3 className="font-title font-semibold text-lg mb-3 text-orange">📊 Deck board</h3>
          <div className="space-y-2">
            {deck.map((slide, i) => (
              <div key={i} className="border border-paper3 p-3 rounded-lg">
                <div className="text-xs text-ink3 mb-1">Slide {slide.slide_number || i + 1}</div>
                <strong className="text-sm">{safeText(slide.title)}</strong>
                <p className="text-xs text-ink2 mt-1">{safeText(slide.content)}</p>
                {slide.viz_suggestion && (
                  <p className="text-xs text-orange mt-1">🎨 {safeText(slide.viz_suggestion)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.length > 0 && (
        <div className="card p-5">
          <h3 className="font-title font-semibold text-lg mb-3 text-orange">👥 Plan équipes</h3>
          <div className="space-y-2">
            {plan.map((p, i) => (
              <div key={i} className="border border-paper3 p-3 rounded-lg">
                <div className="flex justify-between mb-1">
                  <strong className="text-sm">{safeText(p.function || p.department || p.name)}</strong>
                  {p.deadline && <span className="text-xs text-ink3">{safeText(p.deadline)}</span>}
                </div>
                <ul className="list-disc list-inside text-xs space-y-1 text-ink2">
                  {(Array.isArray(p.actions) ? p.actions : []).map((a, k) => <li key={k}>{safeText(a)}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
