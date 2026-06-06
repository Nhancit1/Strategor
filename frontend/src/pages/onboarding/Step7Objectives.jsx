const OBJECTIVES = [
  { id: 'growth', label: 'Croissance du CA' },
  { id: 'profitability', label: 'Profitabilité' },
  { id: 'market_share', label: 'Parts de marché' },
  { id: 'innovation', label: 'Innovation produit' },
  { id: 'digitalization', label: 'Digitalisation' },
  { id: 'international', label: 'International' },
  { id: 'sustainability', label: 'RSE / Durabilité' },
  { id: 'talent', label: 'Talents & recrutement' },
  { id: 'transformation', label: 'Transformation' },
  { id: 'exit', label: 'Préparation cession' },
];

export default function Step7Objectives({ profile, onPatch }) {
  const selected = profile?.objectives || [];
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onPatch({ objectives: next });
  };

  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Objectifs stratégiques</h2>
      <p className="text-ink3 mb-6">Sélectionnez les priorités (max 3-4 recommandé).</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {OBJECTIVES.map((o) => (
          <button
            key={o.id}
            onClick={() => toggle(o.id)}
            className={`px-4 py-2 rounded-full border text-sm ${
              selected.includes(o.id)
                ? 'bg-orange text-white border-orange'
                : 'bg-white text-ink2 border-paper3 hover:border-orange'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div>
        <label className="form-label">Détaillez vos enjeux clés (optionnel mais recommandé)</label>
        <textarea
          className="form-textarea"
          rows={4}
          defaultValue={profile?.objectiveDetail || ''}
          onChange={(e) => onPatch({ objectiveDetail: e.target.value })}
          placeholder="ex: doubler le CA en 3 ans, lancer notre offre SaaS, conquérir l'Allemagne…"
        />
      </div>
    </div>
  );
}
