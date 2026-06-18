import { Compass, Target, ShieldAlert, Clock, Zap, Star, Plus, Trash2 } from 'lucide-react';
import EditableText from './EditableText';

/** Normalize AI output to always return an array */
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Safely render text to prevent React crash if AI returns an object instead of a string */
function safeText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

const RISK_BADGES = {
  FAIBLE: 'bg-green/10 text-green border-green/30',
  MOYEN: 'bg-amber-50 text-amber-700 border-amber-200',
  'ÉLEVÉ': 'bg-red-50 text-red-700 border-red-200',
};

export default function OptionsView({ output, editing, onOutputChange }) {
  if (!output) return null;

  const options = output.options || [];
  const recommendation = output.recommendation || {};

  const updateOptionField = (optIndex, field, value) => {
    const clone = structuredClone(output);
    if (!clone.options) clone.options = [];
    if (!clone.options[optIndex]) clone.options[optIndex] = {};
    clone.options[optIndex][field] = value;
    onOutputChange?.(clone);
  };

  const updateOptionArrayItem = (optIndex, field, itemIndex, value) => {
    const clone = structuredClone(output);
    if (!clone.options) clone.options = [];
    if (!clone.options[optIndex]) clone.options[optIndex] = {};
    const arr = toArray(clone.options[optIndex][field]);
    arr[itemIndex] = value;
    clone.options[optIndex][field] = arr;
    onOutputChange?.(clone);
  };

  const addKeyMove = (optIndex) => {
    const clone = structuredClone(output);
    if (!clone.options) clone.options = [];
    if (!clone.options[optIndex]) clone.options[optIndex] = {};
    const moves = toArray(clone.options[optIndex].key_moves);
    moves.push('Nouveau mouvement clé');
    clone.options[optIndex].key_moves = moves;
    onOutputChange?.(clone);
  };

  const removeKeyMove = (optIndex, itemIndex) => {
    const clone = structuredClone(output);
    if (!clone.options) clone.options = [];
    if (!clone.options[optIndex]) clone.options[optIndex] = {};
    const moves = toArray(clone.options[optIndex].key_moves);
    moves.splice(itemIndex, 1);
    clone.options[optIndex].key_moves = moves;
    onOutputChange?.(clone);
  };

  const addMainRisk = (optIndex) => {
    const clone = structuredClone(output);
    if (!clone.options) clone.options = [];
    if (!clone.options[optIndex]) clone.options[optIndex] = {};
    const risks = toArray(clone.options[optIndex].main_risks);
    risks.push('Nouveau risque');
    clone.options[optIndex].main_risks = risks;
    onOutputChange?.(clone);
  };

  const removeMainRisk = (optIndex, itemIndex) => {
    const clone = structuredClone(output);
    if (!clone.options) clone.options = [];
    if (!clone.options[optIndex]) clone.options[optIndex] = {};
    const risks = toArray(clone.options[optIndex].main_risks);
    risks.splice(itemIndex, 1);
    clone.options[optIndex].main_risks = risks;
    onOutputChange?.(clone);
  };

  const updateRecommendationField = (field, value) => {
    const clone = structuredClone(output);
    if (!clone.recommendation) clone.recommendation = {};
    clone.recommendation[field] = value;
    onOutputChange?.(clone);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Intro info panel */}
      <div className="p-4 bg-paper2 border border-paper3 rounded-xl flex items-start gap-3">
        <Compass size={20} className="text-orange shrink-0 mt-0.5" />
        <div>
          <h4 className="font-title font-semibold text-sm text-ink">Scénarios & Options Stratégiques</h4>
          <p className="text-xs text-ink3 mt-0.5 leading-relaxed">
            Ces options présentent des trajectoires distinctes et mutuellement exclusives étudiées lors du diagnostic. 
            La recommandation finale fournit la base sur laquelle l'axe stratégique global (Roadmap) est bâti.
          </p>
        </div>
      </div>

      {/* Grid of Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {options.map((option, idx) => {
          const keyMoves = toArray(option.key_moves);
          const mainRisks = toArray(option.main_risks);
          const isChosen = recommendation.chosen_option && option.title && 
            recommendation.chosen_option.toLowerCase().trim() === option.title.toLowerCase().trim();

          return (
            <div 
              key={idx} 
              className={`card flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                isChosen ? 'border-orange ring-1 ring-orange/20' : 'border-paper3'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-paper3 bg-paper/50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${isChosen ? 'text-orange' : 'text-ink3'}`}>
                    Option 0{idx + 1} {isChosen && '• Recommandée'}
                  </span>
                  
                  {/* Risk Level Badge */}
                  {editing ? (
                    <div className="flex gap-1">
                      {['FAIBLE', 'MOYEN', 'ÉLEVÉ'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => updateOptionField(idx, 'risk_level', lvl)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                            option.risk_level === lvl
                              ? RISK_BADGES[lvl]
                              : 'bg-white text-ink3 border-paper3 hover:bg-paper2'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  ) : (
                    option.risk_level && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${RISK_BADGES[option.risk_level] || RISK_BADGES.MOYEN}`}>
                        Risque : {option.risk_level}
                      </span>
                    )
                  )}
                </div>

                <h3 className="font-title font-bold text-lg text-ink leading-tight">
                  <EditableText
                    value={safeText(option.title || `Option ${idx + 1}`)}
                    onChange={editing ? (v) => updateOptionField(idx, 'title', v) : undefined}
                    placeholder="Titre de l'option..."
                  />
                </h3>

                {/* Horizon de retour */}
                <div className="flex items-center gap-1.5 text-xs text-ink3 mt-1">
                  <Clock size={12} className="text-ink3" />
                  <span className="font-medium">Retour :</span>
                  <EditableText
                    value={safeText(option.payback_horizon || 'Non défini')}
                    onChange={editing ? (v) => updateOptionField(idx, 'payback_horizon', v) : undefined}
                    placeholder="Ex: 12-18 mois..."
                  />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 space-y-4">
                {/* Thesis */}
                <div>
                  <h4 className="text-xs font-bold text-ink3 uppercase tracking-wider mb-1">Thèse stratégique</h4>
                  <div className="p-3 bg-paper2 rounded-lg border-l-2 border-orange/40 text-sm text-ink2 leading-relaxed italic">
                    <EditableText
                      value={safeText(option.thesis)}
                      onChange={editing ? (v) => updateOptionField(idx, 'thesis', v) : undefined}
                      multiline
                      placeholder="Thèse et pari fondamental de cette trajectoire..."
                    />
                  </div>
                </div>

                {/* Key Moves */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-bold text-ink3 uppercase tracking-wider flex items-center gap-1">
                      <Target size={13} className="text-orange" /> Mouvements clés
                    </h4>
                    {editing && (
                      <button
                        type="button"
                        onClick={() => addKeyMove(idx)}
                        className="text-[10px] text-orange hover:text-orangeDark font-semibold flex items-center gap-0.5"
                      >
                        <Plus size={10} /> Ajouter
                      </button>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {keyMoves.map((move, mIdx) => (
                      <li key={mIdx} className="flex items-start justify-between gap-2 text-xs text-ink2">
                        <div className="flex items-start gap-1.5 flex-1">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange" />
                          <EditableText
                            value={safeText(move)}
                            onChange={editing ? (v) => updateOptionArrayItem(idx, 'key_moves', mIdx, v) : undefined}
                            placeholder="Mouvement clé..."
                            className="flex-1"
                          />
                        </div>
                        {editing && (
                          <button
                            type="button"
                            onClick={() => removeKeyMove(idx, mIdx)}
                            className="text-red-500 hover:text-red-700 mt-0.5 shrink-0"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Success Conditions */}
                <div>
                  <h4 className="text-xs font-bold text-ink3 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Zap size={13} className="text-amber-500" /> Conditions de succès
                  </h4>
                  <div className="text-xs text-ink2 leading-relaxed">
                    <EditableText
                      value={safeText(option.winning_conditions || 'Non définies')}
                      onChange={editing ? (v) => updateOptionField(idx, 'winning_conditions', v) : undefined}
                      multiline
                      placeholder="Facteurs clés de succès..."
                    />
                  </div>
                </div>

                {/* Main Risks */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-bold text-ink3 uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert size={13} className="text-red-500" /> Risques principaux
                    </h4>
                    {editing && (
                      <button
                        type="button"
                        onClick={() => addMainRisk(idx)}
                        className="text-[10px] text-orange hover:text-orangeDark font-semibold flex items-center gap-0.5"
                      >
                        <Plus size={10} /> Ajouter
                      </button>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {mainRisks.map((risk, rIdx) => (
                      <li key={rIdx} className="flex items-start justify-between gap-2 text-xs text-ink2">
                        <div className="flex items-start gap-1.5 flex-1">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                          <EditableText
                            value={safeText(risk)}
                            onChange={editing ? (v) => updateOptionArrayItem(idx, 'main_risks', rIdx, v) : undefined}
                            placeholder="Risque..."
                            className="flex-1"
                          />
                        </div>
                        {editing && (
                          <button
                            type="button"
                            onClick={() => removeMainRisk(idx, rIdx)}
                            className="text-red-500 hover:text-red-700 mt-0.5 shrink-0"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation Section */}
      <div className="card border-l-4 border-l-orange p-6 bg-gradient-to-r from-orange/[0.02] to-amber/[0.02] shadow-sm rounded-r-xl space-y-4">
        <div className="flex items-center gap-2 text-orange">
          <Star size={18} className="fill-orange" />
          <h3 className="font-title font-bold text-lg">Option Recommandée & Justification</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-ink3 uppercase tracking-wider block mb-1">Option retenue</label>
            {editing ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => updateRecommendationField('chosen_option', opt.title)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      recommendation.chosen_option === opt.title
                        ? 'bg-orange text-white border-orange shadow-sm'
                        : 'bg-white text-ink border-paper3 hover:bg-paper2'
                    }`}
                  >
                    {opt.title || `Option ${oIdx + 1}`}
                  </button>
                ))}
                <div className="w-full mt-1">
                  <EditableText
                    value={safeText(recommendation.chosen_option)}
                    onChange={(v) => updateRecommendationField('chosen_option', v)}
                    placeholder="Saisir ou sélectionner l'option recommandée..."
                    className="font-semibold text-ink text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="inline-block px-3 py-1 bg-orange/10 text-orangeDark rounded-lg text-sm font-bold border border-orange/20">
                {recommendation.chosen_option || 'Aucune option recommandée définie'}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-ink3 uppercase tracking-wider block mb-1">Justification stratégique</label>
            <p className="text-sm text-ink2 leading-relaxed">
              <EditableText
                value={safeText(recommendation.rationale)}
                onChange={editing ? (v) => updateRecommendationField('rationale', v) : undefined}
                multiline
                placeholder="Raison d'être de cette recommandation..."
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
