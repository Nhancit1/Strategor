import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

import Step1StartingPoint from './Step1StartingPoint';
import Step2Company from './Step2Company';
import Step3Sector from './Step3Sector';
import Step4Territory from './Step4Territory';
import Step5StageSize from './Step5StageSize';
import Step6Market from './Step6Market';
import Step7Objectives from './Step7Objectives';
import Step8Internal from './Step8Internal';
import Step8Recap from './Step8Recap';

const STEPS = [
  { id: 1, label: 'Point de départ', component: Step1StartingPoint },
  { id: 2, label: 'Entreprise', component: Step2Company },
  { id: 3, label: 'Secteur', component: Step3Sector },
  { id: 4, label: 'Territoire', component: Step4Territory },
  { id: 5, label: 'Stade & taille', component: Step5StageSize },
  { id: 6, label: 'Marché cible', component: Step6Market },
  { id: 7, label: 'Objectifs', component: Step7Objectives },
  { id: 8, label: 'Forces & portefeuille', component: Step8Internal },
  { id: 9, label: 'Récapitulatif', component: Step8Recap },
];

export default function OnboardingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { onboarding, fetchOnboarding, updateOnboarding, launchAnalysis } = useProjectStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchOnboarding(id);
  }, [id, fetchOnboarding]);

  // Autosave debounced
  const handlePatch = useCallback((patch) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateOnboarding(id, patch);
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [id, updateOnboarding]);

  const handleLaunch = async () => {
    await launchAnalysis(id, { phase: 'all' });
    navigate(`/projects/${id}/agents`);
  };

  const StepComponent = STEPS.find((s) => s.id === step)?.component;
  const progress = (step / STEPS.length) * 100;

  if (!onboarding) return <div className="container-narrow py-12 text-ink3">{t('common.loading')}</div>;

  return (
    <div className="container-narrow py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-title text-2xl font-semibold">{t('onboarding.title')}</h1>
          <span className="text-sm text-ink3">
            {t('onboarding.step', { current: step, total: STEPS.length })}
          </span>
        </div>
        <div className="h-2 bg-paper2 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-ink3 mt-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`hover:text-ink ${step === s.id ? 'text-orange font-semibold' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 md:p-8 mb-6">
        {StepComponent && (
          <StepComponent
            profile={onboarding}
            onPatch={handlePatch}
          />
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="btn-secondary"
        >
          <ChevronLeft size={16} className="inline mr-1" />
          {t('common.previous')}
        </button>

        <div className="text-sm text-ink3">
          {saving ? t('onboarding.saving') : savedAt ? `✓ ${t('onboarding.saved')}` : ''}
        </div>

        {step < STEPS.length ? (
          <button onClick={() => setStep(step + 1)} className="btn-primary">
            {t('common.next')}
            <ChevronRight size={16} className="inline ml-1" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/projects/${id}/finance`)}
              className="btn-primary"
              title="Recommandé : améliore tes analyses"
            >
              💰 Renseigner les finances
              <ChevronRight size={16} className="inline ml-1" />
            </button>
            <button onClick={handleLaunch} className="btn-secondary" title="Lancer sans données financières">
              ⊝ Passer & lancer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
