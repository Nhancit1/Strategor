export default function DeliverablesView({ output }) {
  if (!output) return null;
  const er = output.executive_report;
  const deck = output.board_deck || [];
  const plan = output.team_plan || [];

  return (
    <div className="space-y-6">
      {er && (
        <div className="card p-5">
          <h3 className="font-title font-semibold text-lg mb-3 text-orange">📄 Rapport dirigeant</h3>
          {er.executive_summary && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1">Synthèse exécutive</h4>
              <p className="text-sm text-ink2 whitespace-pre-line">{er.executive_summary}</p>
            </div>
          )}
          {er.strategic_analysis && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1">Analyse stratégique</h4>
              <p className="text-sm text-ink2 whitespace-pre-line">{er.strategic_analysis}</p>
            </div>
          )}
          {er.recommendations?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1">Recommandations</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {er.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {er.action_plan_18m && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Plan 18 mois</h4>
              <p className="text-sm text-ink2 whitespace-pre-line">{er.action_plan_18m}</p>
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
                <div className="text-xs text-ink3 mb-1">Slide {slide.slide_number}</div>
                <strong className="text-sm">{slide.title}</strong>
                <p className="text-xs text-ink2 mt-1">{slide.content}</p>
                {slide.viz_suggestion && (
                  <p className="text-xs text-orange mt-1">🎨 {slide.viz_suggestion}</p>
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
                  <strong className="text-sm">{p.function}</strong>
                  {p.deadline && <span className="text-xs text-ink3">{p.deadline}</span>}
                </div>
                <ul className="list-disc list-inside text-xs space-y-1 text-ink2">
                  {(p.actions || []).map((a, k) => <li key={k}>{a}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
