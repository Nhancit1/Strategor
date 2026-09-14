import { CURRENCIES, currencyOf, currencySymbol } from '../../utils/currency';

export default function Step8Recap({ profile }) {
  const row = (label, value) => (
    <div className="flex justify-between py-2 border-b border-paper2 last:border-0">
      <span className="text-ink3 text-sm">{label}</span>
      <span className="text-ink font-medium text-sm text-right max-w-xs">
        {value || <em className="text-ink3">non renseigné</em>}
      </span>
    </div>
  );

  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Récapitulatif</h2>
      <p className="text-ink3 mb-6">
        Vérifiez les infos ci-dessous. Les 12 agents IA vont s'appuyer dessus pour analyser votre situation.
      </p>
      <div className="space-y-1">
        {row('Entreprise', profile?.companyName)}
        {row('Votre rôle', profile?.userRole)}
        {row('Point de départ', profile?.startingPoint)}
        {row('Secteurs', profile?.sectors?.join(', '))}
        {row('Sous-secteurs (NACE)', profile?.subSectors?.join(', '))}
        {row('Territoires', profile?.territories?.map((t) => (t === 'Local' ? 'Maroc' : t)).join(', '))}
        {row('Précisions territoriales', profile?.territoryDetail)}
        {row('Stade', profile?.stage)}
        {row('Devise', CURRENCIES.find((c) => c.code === currencyOf(profile))?.label)}
        {row('CA annuel', profile?.revenueRange && `${profile.revenueRange} ${currencySymbol(currencyOf(profile))}`)}
        {row('Effectif', profile?.teamSize)}
        {row('Marchés', profile?.marketTypes?.join(', '))}
        {row('Profil client', profile?.customerDescription)}
        {row('Objectifs', profile?.objectives?.join(', '))}
        {row('Enjeux clés', profile?.objectiveDetail)}
        {row('Activité précise', profile?.activityPrecise)}
        {row('Positionnement', profile?.positioning)}
        {row('Périmètre', profile?.valueScope)}
        {row('Forces', profile?.strengths)}
        {row('Difficultés', profile?.weaknesses)}
        {row('Portefeuille', profile?.portfolio?.length ? `${profile.portfolio.length} produit(s)/segment(s)` : null)}
      </div>
      <div className="mt-6 card p-4 bg-paper2">
        <p className="text-sm text-ink2">
          ℹ️ <strong>Prêt à lancer ?</strong> L'analyse prend ~5-10 minutes. Vous pourrez ensuite valider et éditer chaque section avant de générer les livrables.
        </p>
      </div>
    </div>
  );
}
