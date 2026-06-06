const OPTIONS = [
  { id: 'zero', label: 'Je pars de zéro', description: 'Création récente ou pivot complet.' },
  { id: 'structure', label: 'Je veux structurer', description: 'L\'entreprise tourne, je veux formaliser la stratégie.' },
  { id: 'challenge', label: 'Je fais face à un défi', description: 'Marché, concurrence, croissance, transformation.' },
];

export default function Step1StartingPoint({ profile, onPatch }) {
  const selected = profile?.startingPoint;
  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Quel est votre point de départ ?</h2>
      <p className="text-ink3 mb-6">Ça nous aide à adapter le ton et la profondeur de l'analyse.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onPatch({ startingPoint: opt.id })}
            className={`card p-4 text-left transition-all hover:shadow-cardHover ${
              selected === opt.id ? 'ring-2 ring-orange border-orange' : ''
            }`}
          >
            <div className="font-title font-semibold mb-1">{opt.label}</div>
            <div className="text-sm text-ink3">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
