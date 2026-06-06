const STAGES = [
  { id: 'idea', label: 'Idée / projet' },
  { id: 'early', label: 'Démarrage (<2 ans)' },
  { id: 'growing', label: 'En croissance' },
  { id: 'established', label: 'Établie' },
  { id: 'transformation', label: 'En transformation' },
];

const REVENUE = ['<500k', '500k-2M', '2-10M', '10-50M', '50-250M', '>250M'];
const SIZES = ['1-10', '10-50', '50-100', '100-250', '250-1000', '>1000'];

export default function Step5StageSize({ profile, onPatch }) {
  return (
    <div className="space-y-6">
      <h2 className="font-title text-xl font-semibold">Stade & taille</h2>

      <div>
        <label className="form-label">Stade de l'entreprise</label>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => onPatch({ stage: s.id })}
              className={`px-4 py-2 rounded-full border text-sm ${
                profile?.stage === s.id
                  ? 'bg-orange text-white border-orange'
                  : 'bg-white text-ink2 border-paper3 hover:border-orange'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">Chiffre d'affaires annuel (€)</label>
        <div className="flex flex-wrap gap-2">
          {REVENUE.map((r) => (
            <button
              key={r}
              onClick={() => onPatch({ revenueRange: r })}
              className={`px-4 py-2 rounded-full border text-sm ${
                profile?.revenueRange === r
                  ? 'bg-orange text-white border-orange'
                  : 'bg-white text-ink2 border-paper3 hover:border-orange'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">Effectif</label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => onPatch({ teamSize: s })}
              className={`px-4 py-2 rounded-full border text-sm ${
                profile?.teamSize === s
                  ? 'bg-orange text-white border-orange'
                  : 'bg-white text-ink2 border-paper3 hover:border-orange'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
