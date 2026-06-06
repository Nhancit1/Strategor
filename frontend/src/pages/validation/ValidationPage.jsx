import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { agentApi } from '../../api';

import ProfileView from '../../components/viz/ProfileView';
import PestelHeatmap from '../../components/viz/PestelHeatmap';
import SwotMatrix from '../../components/viz/SwotMatrix';
import CompetitiveMap from '../../components/viz/CompetitiveMap';
import PorterPentagon from '../../components/viz/PorterPentagon';
import ValueChainDiagram from '../../components/viz/ValueChainDiagram';
import DiagnosticView from '../../components/viz/DiagnosticView';
import StrategyView from '../../components/viz/StrategyView';
import KpiDashboard from '../../components/viz/KpiDashboard';
import BcgMatrix from '../../components/viz/BcgMatrix';
import ChangeView from '../../components/viz/ChangeView';

const TABS = [
  { id: 'profile', agentId: 1, label: 'Profil', Component: ProfileView },
  { id: 'pestel', agentId: 2, label: 'PESTEL', Component: PestelHeatmap },
  { id: 'swot', agentId: 3, label: 'SWOT', Component: SwotMatrix },
  { id: 'competition', agentId: 4, label: 'Concurrence', Component: CompetitiveMap },
  { id: 'porter', agentId: 9, label: 'Porter', Component: PorterPentagon },
  { id: 'valuechain', agentId: 10, label: 'Chaîne de valeur', Component: ValueChainDiagram },
  { id: 'diagnostic', agentId: 5, label: 'Diagnostic', Component: DiagnosticView },
  { id: 'strategy', agentId: 6, label: 'Stratégie', Component: StrategyView },
  { id: 'kpis', agentId: 7, label: 'KPIs', Component: KpiDashboard },
  { id: 'bcg', agentId: 11, label: 'BCG', Component: BcgMatrix },
  { id: 'change', agentId: 12, label: 'Change', Component: ChangeView },
];

export default function ValidationPage() {
  const { id, tab } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { agents, fetchAgents } = useProjectStore();
  const [activeTab, setActiveTab] = useState(tab || TABS[0].id);

  useEffect(() => { fetchAgents(id); }, [id, fetchAgents]);
  useEffect(() => { if (tab) setActiveTab(tab); }, [tab]);

  const tabConfig = TABS.find((tt) => tt.id === activeTab) || TABS[0];
  const currentAgent = agents.find((a) => a.agentId === tabConfig.agentId);
  const Visualization = tabConfig.Component;

  const onSelectTab = (tabId) => {
    setActiveTab(tabId);
    navigate(`/projects/${id}/validate/${tabId}`);
  };

  const handleValidate = async () => {
    if (!currentAgent?.output) return;
    await agentApi.updateOutput(id, tabConfig.agentId, currentAgent.editedOutput || currentAgent.output);
    fetchAgents(id);
  };

  const handleRegenerate = async () => {
    if (!currentAgent) return;
    await agentApi.regenerate(id, tabConfig.agentId);
    fetchAgents(id);
  };

  const allValidated = useMemo(
    () => TABS.every((tt) => {
      const a = agents.find((x) => x.agentId === tt.agentId);
      return !a || a.status === 'SKIPPED' || a.validatedAt;
    }),
    [agents]
  );

  const output = currentAgent?.editedOutput || currentAgent?.output;

  return (
    <div className="container-wide py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-title text-3xl font-bold mb-1">{t('validation.title')}</h1>
          <p className="text-ink3">{t('validation.subtitle')}</p>
        </div>
        {allValidated && (
          <Link to={`/projects/${id}/deliverables`} className="btn-primary">
            Voir les livrables →
          </Link>
        )}
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {TABS.map((tt) => {
          const agent = agents.find((a) => a.agentId === tt.agentId);
          const validated = !!agent?.validatedAt;
          const skipped = agent?.status === 'SKIPPED';
          return (
            <button
              key={tt.id}
              onClick={() => onSelectTab(tt.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tt.id
                  ? 'bg-orange text-white'
                  : 'text-ink2 hover:bg-paper2'
              }`}
            >
              {tt.label}
              {validated && <CheckCircle2 size={14} className="inline ml-1.5 text-green" />}
              {skipped && <span className="ml-1.5 text-xs">⊝</span>}
            </button>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-xl border border-paper3 shadow-card">
        {agents.length === 0 ? (
          <p className="text-ink3">{t('common.loading')}</p>
        ) : !currentAgent ? (
          <p className="text-ink3">Cet agent n'a pas été exécuté pour ce projet (mode ou conditions non remplis).</p>
        ) : currentAgent.status === 'SKIPPED' ? (
          <p className="text-ink3">Cet agent n'est pas applicable à votre profil.</p>
        ) : currentAgent.status !== 'DONE' ? (
          <p className="text-ink3">
            Statut : <strong>{currentAgent.status}</strong>. {currentAgent.errorMessage}
          </p>
        ) : (
          <>
            <div className="flex justify-end gap-2 mb-4">
              <button onClick={handleRegenerate} className="btn-secondary text-sm">
                <RefreshCw size={14} className="inline mr-1.5" />
                {t('validation.regenerate')}
              </button>
              <button onClick={handleValidate} className="btn-primary text-sm">
                <CheckCircle2 size={14} className="inline mr-1.5" />
                {t('validation.validate')}
              </button>
            </div>
            {Visualization && output ? (
              <Visualization output={output} />
            ) : (
              <pre className="bg-paper2 p-4 rounded-lg text-xs overflow-auto max-h-[60vh]">
                {JSON.stringify(output, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
