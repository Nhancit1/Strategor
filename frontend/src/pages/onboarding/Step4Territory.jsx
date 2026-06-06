const TERRITORIES = ['FR', 'EU', 'Monde', 'Local'];

export default function Step4Territory({ profile, onPatch }) {
  const selected = profile?.territories || [];
  const toggle = (t) => {
    const next = selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t];
    onPatch({ territories: next });
  };

  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Territoires d'activité</h2>
      <p className="text-ink3 mb-6">Où opérez-vous ?</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {TERRITORIES.map((t) => (
          <button
            key={t}
            onClick={() => toggle(t)}
            className={`px-4 py-2 rounded-full border text-sm ${
              selected.includes(t)
                ? 'bg-orange text-white border-orange'
                : 'bg-white text-ink2 border-paper3 hover:border-orange'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div>
        <label className="form-label">Précisions (optionnel)</label>
        <textarea
          className="form-textarea"
          defaultValue={profile?.territoryDetail || ''}
          onChange={(e) => onPatch({ territoryDetail: e.target.value })}
          placeholder="ex: principalement Île-de-France et Rhône-Alpes, début d'export Allemagne"
        />
      </div>
    </div>
  );
}
