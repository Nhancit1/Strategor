import { SECTOR_TAXONOMY, SECTORS_L1, subSectorKey, belongsTo } from '../../data/sectorTaxonomy';

// Étape 3 — secteur à DEUX niveaux (taxonomie dérivée NACE Rév. 2).
// Niveau 1 : `sectors` (inchangé, rétro-compatible avec les agents et le récap).
// Niveau 2 : `subSectors`, persistés sous la forme "Secteur — Sous-secteur".
export default function Step3Sector({ profile, onPatch }) {
  const selected = profile?.sectors || [];
  const subSelected = profile?.subSectors || [];

  const toggleL1 = (sector) => {
    const isRemoving = selected.includes(sector);
    const next = isRemoving
      ? selected.filter((s) => s !== sector)
      : [...selected, sector];
    const patch = { sectors: next };
    if (isRemoving) {
      // Désélectionner un secteur retire aussi ses sous-secteurs.
      patch.subSectors = subSelected.filter((k) => !belongsTo(k, sector));
    }
    onPatch(patch);
  };

  const toggleL2 = (l1, sub) => {
    const key = subSectorKey(l1, sub);
    const next = subSelected.includes(key)
      ? subSelected.filter((k) => k !== key)
      : [...subSelected, key];
    onPatch({ subSectors: next });
  };

  const panels = selected.filter((s) => (SECTOR_TAXONOMY[s]?.subs || []).length > 0);

  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Votre secteur</h2>
      <p className="text-ink3 mb-6">
        Sélectionnez un ou plusieurs secteurs d'activité, puis précisez le ou les
        sous-secteurs : plus le ciblage est fin, plus l'analyse des agents est pertinente.
      </p>

      <div className="flex flex-wrap gap-2">
        {SECTORS_L1.map((s) => (
          <button
            key={s}
            onClick={() => toggleL1(s)}
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

      {panels.map((l1) => {
        const { nace, subs } = SECTOR_TAXONOMY[l1];
        return (
          <div key={l1} className="mt-5 card p-4">
            <p className="text-sm font-medium text-ink2 mb-3">
              Précisez — {l1}
              {nace && <span className="text-ink3 font-normal"> · NACE {nace}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {subs.map((sub) => {
                const key = subSectorKey(l1, sub);
                const on = subSelected.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleL2(l1, sub)}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                      on
                        ? 'bg-ink text-white border-ink'
                        : 'bg-paper text-ink2 border-paper3 hover:border-ink'
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
