export default function Step2Company({ profile, onPatch }) {
  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Votre entreprise</h2>
      <p className="text-ink3 mb-6">Quelques infos basiques.</p>
      <div className="space-y-4">
        <div>
          <label className="form-label">Nom de l'entreprise</label>
          <input
            type="text"
            className="form-input"
            defaultValue={profile?.companyName || ''}
            onChange={(e) => onPatch({ companyName: e.target.value })}
            placeholder="ex: Maison Berthier"
          />
        </div>
        <div>
          <label className="form-label">Votre rôle</label>
          <input
            type="text"
            className="form-input"
            defaultValue={profile?.userRole || ''}
            onChange={(e) => onPatch({ userRole: e.target.value })}
            placeholder="ex: Président, CEO, DG…"
          />
        </div>
        <div>
          <label className="form-label">Activité précise</label>
          <input
            type="text"
            className="form-input"
            defaultValue={profile?.activityPrecise || ''}
            onChange={(e) => onPatch({ activityPrecise: e.target.value })}
            placeholder="ex: fabrication et pose de menuiseries aluminium sur mesure"
          />
          <p className="form-help">Sois précis : c'est ce qui rend l'analyse spécifique à ton métier.</p>
        </div>
        <div>
          <label className="form-label">Positionnement</label>
          <textarea
            className="form-textarea"
            defaultValue={profile?.positioning || ''}
            onChange={(e) => onPatch({ positioning: e.target.value })}
            placeholder="ex: premium, qualité supérieure, délais courts, sur-mesure haut de gamme"
          />
        </div>
      </div>
    </div>
  );
}
