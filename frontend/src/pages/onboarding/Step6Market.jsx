const MARKETS = [
  { id: 'B2B', label: 'B2B', description: 'Entreprises' },
  { id: 'B2C', label: 'B2C', description: 'Particuliers' },
  { id: 'B2G', label: 'B2G', description: 'Secteur public' },
  { id: 'B2B2C', label: 'B2B2C', description: 'Indirect via partenaires' },
];

export default function Step6Market({ profile, onPatch }) {
  const selected = profile?.marketTypes || [];
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onPatch({ marketTypes: next });
  };

  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Marché cible</h2>
      <p className="text-ink3 mb-6">À qui vous adressez-vous ?</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            className={`card p-4 text-left transition-all hover:shadow-cardHover ${
              selected.includes(m.id) ? 'ring-2 ring-orange border-orange' : ''
            }`}
          >
            <div className="font-title font-semibold text-lg mb-1">{m.label}</div>
            <div className="text-sm text-ink3">{m.description}</div>
          </button>
        ))}
      </div>
      <div>
        <label className="form-label">Profil client type (optionnel)</label>
        <textarea
          className="form-textarea"
          defaultValue={profile?.customerDescription || ''}
          onChange={(e) => onPatch({ customerDescription: e.target.value })}
          placeholder="ex: PME industrielles 50-500 personnes, secteur agroalimentaire, France"
        />
      </div>
    </div>
  );
}
