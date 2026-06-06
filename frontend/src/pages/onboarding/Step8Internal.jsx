import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function Step8Internal({ profile, onPatch }) {
  const [rows, setRows] = useState(
    Array.isArray(profile?.portfolio) && profile.portfolio.length ? profile.portfolio : []
  );

  const sync = (next) => {
    setRows(next);
    onPatch({ portfolio: next });
  };
  const addRow = () => sync([...rows, { name: '', revenueShare: null, growth: null, marketShare: null }]);
  const removeRow = (i) => sync(rows.filter((_, idx) => idx !== i));
  const updateRow = (i, key, value) => sync(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  const num = (v) => (v === '' || v == null ? null : Number(v));

  return (
    <div>
      <h2 className="font-title text-xl font-semibold mb-2">Forces & portefeuille</h2>
      <p className="text-ink3 mb-6">
        Ta réalité interne et tes produits. Plus c'est précis, plus le diagnostic et la matrice BCG seront pertinents.
      </p>

      <div className="space-y-4">
        <div>
          <label className="form-label">Périmètre d'activité</label>
          <textarea
            className="form-textarea"
            defaultValue={profile?.valueScope || ''}
            onChange={(e) => onPatch({ valueScope: e.target.value })}
            placeholder="Que fais-tu en interne / sous-traites-tu ? (conception, fabrication, distribution, pose, SAV…)"
          />
        </div>
        <div>
          <label className="form-label">Forces principales</label>
          <textarea
            className="form-textarea"
            defaultValue={profile?.strengths || ''}
            onChange={(e) => onPatch({ strengths: e.target.value })}
            placeholder="ex: maîtrise technique, certifications, relation client, outil industriel récent…"
          />
        </div>
        <div>
          <label className="form-label">Difficultés / points faibles</label>
          <textarea
            className="form-textarea"
            defaultValue={profile?.weaknesses || ''}
            onChange={(e) => onPatch({ weaknesses: e.target.value })}
            placeholder="ex: dépendance à quelques clients, marges sous pression, recrutement difficile…"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">Portefeuille produits / segments</label>
            <button type="button" onClick={addRow} className="btn-ghost text-sm">
              <Plus size={15} className="inline mr-1" /> Ajouter
            </button>
          </div>
          <p className="form-help mb-3">
            Optionnel mais recommandé — alimente la matrice BCG (part de CA, croissance du segment, part de marché relative).
          </p>

          {rows.length === 0 ? (
            <div className="text-ink3 text-sm border border-dashed border-paper3 rounded-lg px-4 py-6 text-center">
              Aucun produit/segment. Clique « Ajouter » pour en saisir.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-ink3 px-1">
                <span className="col-span-5">Produit / segment</span>
                <span className="col-span-2 text-right">% du CA</span>
                <span className="col-span-2 text-right">Croissance %</span>
                <span className="col-span-2 text-right">Part marché</span>
                <span className="col-span-1" />
              </div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="form-input col-span-5"
                    placeholder="ex: Menuiseries HT"
                    value={r.name || ''}
                    onChange={(e) => updateRow(i, 'name', e.target.value)}
                  />
                  <input
                    className="form-input col-span-2 text-right"
                    type="number"
                    placeholder="—"
                    value={r.revenueShare ?? ''}
                    onChange={(e) => updateRow(i, 'revenueShare', num(e.target.value))}
                  />
                  <input
                    className="form-input col-span-2 text-right"
                    type="number"
                    placeholder="—"
                    value={r.growth ?? ''}
                    onChange={(e) => updateRow(i, 'growth', num(e.target.value))}
                  />
                  <input
                    className="form-input col-span-2 text-right"
                    type="number"
                    placeholder="—"
                    value={r.marketShare ?? ''}
                    onChange={(e) => updateRow(i, 'marketShare', num(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="btn-ghost text-red-700 col-span-1"
                    title="Retirer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
