const SECTORS = [
  'Industrie', 'Bâtiment & Construction', 'Tech / SaaS', 'Retail',
  'Services B2B', 'Services B2C', 'Agroalimentaire', 'Santé',
  'Énergie', 'Transport / Logistique', 'Finance / Assurance', 'Autre',
];

export default function Step3Sector({ profile, onPatch }) {
  const selected = profile?.sectors || [];
  const toggle = (sector) => {
    const next = selected.includes(sector)
      ? selected.filter((s) => s !== sector)
      : [...selected, sector];
    onPatch({ sectors: next });
  };

  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Votre secteur</h2>
      <p className="text-ink3 mb-6">Sélectionnez un ou plusieurs secteurs d'activité.</p>
      <div className="flex flex-wrap gap-2">
        {SECTORS.map((s) => (
          <button
            key={s}
            onClick={() => toggle(s)}
            className={`px-4 py-2 rounded-full border text-sm transition-all ${
              selected.includes(s)
                ? 'bg-orange text-white border-orange'
                : 'bg-white text-ink2 border-paper3 hover:border-orange'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
