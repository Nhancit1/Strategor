import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CURRENCIES, REVENUE_RANGES, currencyOf, currencySymbol, mapRevenueRange } from '../../utils/currency';

const STAGES = [
  { id: 'idea', label: 'Idée / projet' },
  { id: 'early', label: 'Démarrage (<2 ans)' },
  { id: 'growing', label: 'En croissance' },
  { id: 'established', label: 'Établie' },
  { id: 'transformation', label: 'En transformation' },
];

const SIZES = ['1-10', '10-50', '50-100', '100-250', '250-1000', '>1000'];

export default function Step5StageSize({ profile, onPatch, saving }) {
  const currency = currencyOf(profile);
  const [currencySaving, setCurrencySaving] = useState(false);
  useEffect(() => {
    if (!saving) setCurrencySaving(false);
  }, [saving]);

  // Send currency and the re-mapped bucket in ONE patch: the autosave debounce keeps
  // only the last patch, so two separate calls would drop the first.
  const changeCurrency = (next) => {
    if (next === currency) return;
    const patch = { currency: next };
    const mapped = mapRevenueRange(profile?.revenueRange, currency, next);
    if (mapped) patch.revenueRange = mapped;
    setCurrencySaving(true);
    onPatch(patch);
  };

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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="form-label mb-0">
            Chiffre d'affaires annuel ({currencySymbol(currency)})
          </label>
          <div className="flex items-center gap-1" role="group" aria-label="Devise du projet" aria-busy={currencySaving}>
            {currencySaving && (
              <span className="flex items-center gap-1 text-xs text-ink3 mr-1" role="status">
                <Loader2 size={12} className="animate-spin" />
                Enregistrement…
              </span>
            )}
            <span className="text-xs text-ink3 mr-1">Devise :</span>
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => changeCurrency(c.code)}
                title={c.label}
                className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                  currency === c.code
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-ink2 border-paper3 hover:border-ink3'
                }`}
              >
                {c.code}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink3 mb-3">
          Cette devise s'applique à tout le projet : finance, analyses de l'IA et livrables.
        </p>
        <div className="flex flex-wrap gap-2">
          {REVENUE_RANGES[currency].map((r) => (
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
