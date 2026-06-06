import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Sparkles, TrendingUp, Info, HelpCircle } from 'lucide-react';
import { financeApi, projectApi } from '../../api';
import DocumentUploader from '../../components/documents/DocumentUploader';

const CORE_INDICATORS = [
  { key: 'revenue', label: 'Chiffre d\'affaires annuel', help: 'Hors taxes, dernier exercice clos', unit: '€', type: 'number' },
  { key: 'revenue_growth', label: 'Croissance du CA (3 ans)', help: 'Tendance moyenne annuelle', type: 'select',
    options: [
      { value: 'strong', label: '↗ Forte (> 15 %)' },
      { value: 'moderate', label: '↗ Modérée (5-15 %)' },
      { value: 'stable', label: '→ Stable (±5 %)' },
      { value: 'decline', label: '↘ Recul' },
    ],
  },
  { key: 'gross_margin_percent', label: 'Marge brute', help: '(CA – coûts variables directs) / CA', unit: '%', type: 'number' },
  { key: 'ebitda_margin_percent', label: 'Marge EBITDA', help: 'EBITDA / CA', unit: '%', type: 'number' },
  { key: 'team_size', label: 'Effectif équivalent temps plein', help: 'Salariés + dirigeants — ETP', unit: 'ETP', type: 'number' },
  { key: 'customer_count', label: 'Nombre de clients actifs', help: 'Avec ≥ 1 achat sur 12 mois', unit: 'clients', type: 'number' },
  { key: 'average_deal_size', label: 'Ticket moyen / projet', help: 'Valeur médiane d\'un chantier/contrat', unit: '€', type: 'number' },
];

const BONUS_INDICATORS = [
  { key: 'dscr', label: 'DSCR (endettement)', help: 'EBITDA / service de la dette annuel', type: 'number' },
  { key: 'capex_percent', label: 'CAPEX annuel', help: 'Investissements / CA', unit: '%', type: 'number' },
  { key: 'recurring_revenue_percent', label: '% revenu récurrent', help: 'SAV, maintenance, contrats', unit: '%', type: 'number' },
];

const ALL = [...CORE_INDICATORS, ...BONUS_INDICATORS];

export default function FinanceLitePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState({});
  const [completeness, setCompleteness] = useState(0);
  const [project, setProject] = useState(null);
  const [savingState, setSavingState] = useState('idle'); // idle | saving | saved
  const [error, setError] = useState(null);

  // Charge l'état initial
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [finRes, projRes] = await Promise.all([
          financeApi.get(id).catch(() => ({ data: null })),
          projectApi.get(id),
        ]);
        if (cancelled) return;
        setProject(projRes.data);
        if (finRes.data?.data) setData(finRes.data.data);
        if (finRes.data?.completenessScore != null) setCompleteness(finRes.data.completenessScore);
      } catch (e) {
        setError('Impossible de charger les données.');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Recalcule la complétude à chaque changement
  useEffect(() => {
    const coreFilled = CORE_INDICATORS.filter((ind) => {
      const v = data[ind.key];
      return v !== undefined && v !== null && v !== '';
    }).length;
    const bonusFilled = BONUS_INDICATORS.filter((ind) => {
      const v = data[ind.key];
      return v !== undefined && v !== null && v !== '';
    }).length;
    // 70% pour les 7 core + 30% pour les 3 bonus
    const pct = Math.round((coreFilled / CORE_INDICATORS.length) * 70 + (bonusFilled / BONUS_INDICATORS.length) * 30);
    setCompleteness(pct);
  }, [data]);

  // Autosave debounced
  const persist = useCallback(async (payload) => {
    setSavingState('saving');
    try {
      await financeApi.update(id, payload);
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 1500);
    } catch (e) {
      setSavingState('idle');
      setError('Échec sauvegarde. Réessayez.');
    }
  }, [id]);

  useEffect(() => {
    if (Object.keys(data).length === 0) return;
    const timer = setTimeout(() => persist(data), 800);
    return () => clearTimeout(timer);
  }, [data, persist]);

  const setVal = (key, value) => setData((d) => ({ ...d, [key]: value }));
  const setDontKnow = (key) => setData((d) => ({ ...d, [key]: '__benchmark__' }));

  const launch = async () => {
    await persist(data);
    await projectApi.launchAnalysis(id, { phase: 'all' });
    navigate(`/projects/${id}/agents`);
  };

  return (
    <div className="container-wide py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link to={`/projects/${id}/onboarding`} className="btn-ghost text-sm">
          <ArrowLeft size={14} className="inline mr-1.5" />
          Retour à l'onboarding
        </Link>
      </div>

      <div className="text-center mb-6">
        <span className="badge bg-orange/10 text-orangeDark text-xs font-semibold">
          OPTIONNEL · améliore tes analyses
        </span>
        <h1 className="font-title text-3xl font-bold mt-3 mb-2">💰 Finance Lite</h1>
        <p className="text-ink3 max-w-xl mx-auto">
          7 indicateurs clés + 3 bonus. Tu peux saisir une valeur, dire « je ne sais pas »
          (on utilise alors un benchmark sectoriel), ou laisser vide.
        </p>
      </div>

      {/* Barre de complétude */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, #FBE5D6, white)', border: '1.5px solid var(--tw-color-orange, #E8621A)' }}>
        <div className="flex items-center gap-5">
          <div className="flex-1">
            <div className="font-title font-bold text-3xl text-orange leading-none">
              {completeness}<span className="text-sm text-ink3"> %</span>
            </div>
            <div className="text-sm text-ink2 mt-1">
              Complétude — autosave {savingState === 'saving' ? '⏳' : savingState === 'saved' ? '✓' : ''}
            </div>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-paper3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${completeness}%`, background: 'linear-gradient(90deg, #E8621A, #C04E10)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ background: '#FBE6E2', borderColor: '#B23B3B', color: '#B23B3B' }}>
          {error}
        </div>
      )}

      {/* Core indicators */}
      <h3 className="font-title font-semibold text-xl mb-3">📊 Indicateurs essentiels</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {CORE_INDICATORS.map((ind) => (
          <IndicatorCard
            key={ind.key}
            indicator={ind}
            value={data[ind.key]}
            onChange={(v) => setVal(ind.key, v)}
            onDontKnow={() => setDontKnow(ind.key)}
          />
        ))}
      </div>

      {/* Bonus indicators */}
      <h3 className="font-title font-semibold text-xl mb-3">
        ⭐ Indicateurs bonus
        <span className="font-normal text-ink3 text-sm ml-2">— pour aller plus loin</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {BONUS_INDICATORS.map((ind) => (
          <IndicatorCard
            key={ind.key}
            indicator={ind}
            value={data[ind.key]}
            onChange={(v) => setVal(ind.key, v)}
            onDontKnow={() => setDontKnow(ind.key)}
            bonus
          />
        ))}
      </div>

      {/* Documents (Grounding) */}
      <h3 className="font-title font-semibold text-xl mb-3">
        📑 Documents
        <span className="font-normal text-ink3 text-sm ml-2">— bilans, plaquettes, deck (max 5)</span>
      </h3>
      <div className="mb-8">
        <DocumentUploader projectId={id} />
      </div>

      {/* Encart pédagogique */}
      <div className="card mb-6" style={{ background: '#E0EAF5', borderColor: '#1B3E6A' }}>
        <h4 className="font-title font-semibold text-blue mb-2 flex items-center gap-2">
          <Info size={16} /> À quoi servent ces données ?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <strong>📊 Diagnostic plus fin</strong>
            <p className="text-ink3 mt-1">Les agents PESTEL, SWOT, Porter contextualisent leurs analyses avec tes vrais chiffres.</p>
          </div>
          <div>
            <strong>🎯 KPIs réalistes</strong>
            <p className="text-ink3 mt-1">L'agent 7 fixe des cibles atteignables au lieu de cibles génériques.</p>
          </div>
          <div>
            <strong>💼 Valorisation crédible</strong>
            <p className="text-ink3 mt-1">L'agent 5 (diagnostic) chiffre tes scénarios de cession / croissance.</p>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex justify-between items-center mt-8">
        <Link to={`/projects/${id}/onboarding`} className="btn-secondary">
          <ArrowLeft size={14} className="inline mr-1.5" />
          Récap onboarding
        </Link>
        <div className="flex gap-2">
          <button onClick={launch} className="btn-secondary">
            ⊝ Passer cette étape
          </button>
          <button onClick={launch} className="btn-primary">
            Lancer l'analyse
            <ArrowRight size={14} className="inline ml-1.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IndicatorCard({ indicator, value, onChange, onDontKnow, bonus }) {
  const filled = value !== undefined && value !== null && value !== '';
  const isBenchmark = value === '__benchmark__';

  return (
    <div className={`card ${filled && !isBenchmark ? '' : 'border-dashed'}`}>
      <div className="flex justify-between items-start mb-1">
        <strong className="font-title text-sm">{indicator.label}</strong>
        {filled && !isBenchmark && <span className="badge bg-green/10 text-green text-xs">✓ Renseigné</span>}
        {isBenchmark && <span className="badge bg-blue/10 text-blue text-xs">📊 Benchmark</span>}
        {!filled && <span className="badge bg-paper2 text-ink3 text-xs">{bonus ? 'Bonus' : 'Vide'}</span>}
      </div>
      <p className="text-ink3 text-xs mb-3">{indicator.help}</p>

      {indicator.type === 'select' ? (
        <div className="flex gap-1 flex-wrap">
          {indicator.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                value === opt.value
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white border-paper3 hover:border-ink3'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            className="form-input flex-1"
            value={isBenchmark || value == null ? '' : value}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            placeholder={isBenchmark ? 'Benchmark sectoriel utilisé' : 'Saisir ou…'}
            disabled={isBenchmark}
          />
          {indicator.unit && <span className="text-sm font-semibold">{indicator.unit}</span>}
        </div>
      )}

      {!filled && (
        <button
          onClick={onDontKnow}
          className="mt-2 text-xs text-ink3 hover:text-ink transition-colors flex items-center gap-1"
        >
          <HelpCircle size={12} />
          Je ne sais pas → benchmark sectoriel
        </button>
      )}

      {isBenchmark && (
        <button
          onClick={() => onChange(null)}
          className="mt-2 text-xs text-orange hover:text-orangeDark transition-colors"
        >
          ← Saisir une valeur
        </button>
      )}
    </div>
  );
}
