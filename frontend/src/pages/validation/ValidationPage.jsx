import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RefreshCw, Pencil, X, Save, Loader2, Download, ArrowLeft } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
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
import RiskMatrix from '../../components/viz/RiskMatrix';
import FinanceScenarios from '../../components/viz/FinanceScenarios';
import ConsistencyView from '../../components/viz/ConsistencyView';
import ConsistencyReport from '../../components/viz/ConsistencyReport';
import SourcesPanel from '../../components/viz/SourcesPanel';
import PartnerReviewView from '../../components/viz/PartnerReviewView';
import OptionsView from '../../components/viz/OptionsView';

const TABS = [
  { id: 'profile', agentId: 1, label: 'Profil', Component: ProfileView },
  { id: 'pestel', agentId: 2, label: 'PESTEL', Component: PestelHeatmap },
  { id: 'swot', agentId: 3, label: 'SWOT', Component: SwotMatrix },
  { id: 'competition', agentId: 4, label: 'Concurrence', Component: CompetitiveMap },
  { id: 'porter', agentId: 9, label: 'Porter', Component: PorterPentagon },
  { id: 'valuechain', agentId: 10, label: 'Chaîne de valeur', Component: ValueChainDiagram },
  { id: 'diagnostic', agentId: 5, label: 'Diagnostic', Component: DiagnosticView },
  { id: 'options', agentId: 17, label: 'Options', Component: OptionsView },
  { id: 'strategy', agentId: 6, label: 'Stratégie', Component: StrategyView },
  { id: 'kpis', agentId: 7, label: 'KPIs', Component: KpiDashboard },
  { id: 'bcg', agentId: 11, label: 'BCG', Component: BcgMatrix },
  { id: 'change', agentId: 12, label: 'Change', Component: ChangeView },
  { id: 'risks', agentId: 13, label: 'Risques', Component: RiskMatrix },
  { id: 'finance', agentId: 14, label: 'Finance', Component: FinanceScenarios },
  { id: 'review', agentId: 15, label: 'Cohérence', Component: ConsistencyView },
  { id: 'partner', agentId: 16, label: 'Revue Associé', Component: PartnerReviewView },
];

export default function ValidationPage() {
  const { id, tab } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { agents, fetchAgents, agentsLoading, current, fetchProject, launchAnalysis } = useProjectStore();
  const user = useAuthStore((s) => s.user);
  const userLang = user?.lang;
  const [activeTab, setActiveTab] = useState(tab || TABS[0].id);
  const [regenerating, setRegenerating] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const exportRef = useRef(null);

  // ── Editing state ──────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [editedOutput, setEditedOutput] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAgents(id); }, [id, fetchAgents, userLang]);
  useEffect(() => { fetchProject(id); }, [id, fetchProject]);
  useEffect(() => { if (tab) setActiveTab(tab); }, [tab]);

  // Reset editing state when switching tabs
  useEffect(() => {
    setEditing(false);
    setEditedOutput(null);
  }, [activeTab]);

  const tabConfig = TABS.find((tt) => tt.id === activeTab) || TABS[0];
  const currentAgent = agents.find((a) => a.agentId === tabConfig.agentId);
  const Visualization = tabConfig.Component;

  const onSelectTab = (tabId) => {
    setActiveTab(tabId);
    navigate(`/projects/${id}/validate/${tabId}`);
  };

  // ── Edit handlers ──────────────────────────────────
  const handleStartEdit = useCallback(() => {
    const output = currentAgent?.editedOutput || currentAgent?.output;
    setEditedOutput(structuredClone(output));
    setEditing(true);
  }, [currentAgent]);

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    setEditedOutput(null);
  }, []);

  const handleOutputChange = useCallback((newOutput) => {
    setEditedOutput(newOutput);
  }, []);

  const handleSaveAndValidate = async () => {
    if (!editedOutput) return;
    setSaving(true);
    try {
      await agentApi.updateOutput(id, tabConfig.agentId, editedOutput);
      await fetchAgents(id);
      setEditing(false);
      setEditedOutput(null);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!currentAgent?.output) return;
    await agentApi.updateOutput(id, tabConfig.agentId, currentAgent.editedOutput || currentAgent.output);
    fetchAgents(id);
  };

  const handleRegenerate = async () => {
    if (!currentAgent || regenerating) return;
    setRegenerating(true);
    // Exit edit mode when regenerating
    setEditing(false);
    setEditedOutput(null);
    try {
      await agentApi.regenerate(id, tabConfig.agentId);
      // Poll until the agent finishes (status changes from PENDING/RUNNING)
      const poll = setInterval(async () => {
        await fetchAgents(id);
        const updated = useProjectStore.getState().agents.find((a) => a.agentId === tabConfig.agentId);
        if (updated && updated.status !== 'PENDING' && updated.status !== 'RUNNING') {
          clearInterval(poll);
          setRegenerating(false);
        }
      }, 3000);
    } catch {
      setRegenerating(false);
    }
  };

  const allValidated = useMemo(
    () => TABS.every((tt) => {
      const a = agents.find((x) => x.agentId === tt.agentId);
      return !a || a.status === 'SKIPPED' || a.validatedAt;
    }),
    [agents]
  );

  // Modules invalidated by an upstream manual edit (see one-click re-derive below).
  const staleAgents = useMemo(
    () => agents.filter((a) => a?.stale && a.status === 'DONE'),
    [agents]
  );
  const [rederiving, setRederiving] = useState(false);
  const handleRederive = async () => {
    if (rederiving || !staleAgents.length) return;
    setRederiving(true);
    try {
      await agentApi.rederiveStale(id);
      setTimeout(() => fetchAgents(id), 1200);
    } catch (e) {
      console.error('Re-derive failed', e);
    } finally {
      setRederiving(false);
    }
  };



  const handleExportHtml = async () => {
    if (exportingHtml || !exportRef.current) return;
    setExportingHtml(true);
    try {
      const { downloadViewAsHtml } = await import('../../utils/exportView');
      await downloadViewAsHtml(exportRef.current, `strategor-${tabConfig.id}`, `Strategor — ${tabConfig.label}`);
    } catch (e) {
      console.error('HTML export failed', e);
      alert("L'export HTML a échoué. " + (e?.message || ''));
    } finally {
      setExportingHtml(false);
    }
  };

  // When editing, show the live edited copy; otherwise show the persisted version
  const displayOutput = editing ? editedOutput : (currentAgent?.editedOutput || currentAgent?.output);

  return (
    <div className="container-wide py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-title text-3xl font-bold mb-1">{t('validation.title')}</h1>
          <p className="text-ink3">{t('validation.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/projects/${id}/agents`} className="btn-secondary flex items-center gap-1.5">
            <ArrowLeft size={16} /> Retour au pipeline
          </Link>
          {allValidated && (
            <Link to={`/projects/${id}/deliverables`} className="btn-primary">
              Voir les livrables →
            </Link>
          )}
        </div>
      </div>

      <ConsistencyReport
        report={current?.consistencyReport}
        onOpenReview={() => onSelectTab('review')}
      />



      {staleAgents.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3">
          <p className="text-sm text-ink2">
            <strong>{staleAgents.length} module{staleAgents.length > 1 ? 's' : ''}</strong>{' '}
            dépend{staleAgents.length > 1 ? 'ent' : ''} d’une modification récente et
            doi{staleAgents.length > 1 ? 'vent' : 't'} être régénéré{staleAgents.length > 1 ? 's' : ''}.
          </p>
          <button
            onClick={handleRederive}
            disabled={rederiving}
            className="btn-primary text-sm whitespace-nowrap flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={rederiving ? 'animate-spin' : ''} />
            {rederiving ? 'Régénération…' : 'Re-générer les modules périmés'}
          </button>
        </div>
      )}

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {TABS.map((tt) => {
          const agent = agents.find((a) => a.agentId === tt.agentId);
          const validated = !!agent?.validatedAt;
          const skipped = agent?.status === 'SKIPPED';
          const stale = !!agent?.stale;
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
              {stale && (
                <span
                  title="Périmé — dépend d’une modification"
                  className={`inline-block ml-1.5 w-2 h-2 rounded-full align-middle ${activeTab === tt.id ? 'bg-white' : 'bg-orange'}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-xl border border-paper3 shadow-card min-h-[300px] flex flex-col justify-center">
        {agentsLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center my-auto">
            <Loader2 size={40} className="text-orange animate-spin mb-4" />
            <h3 className="font-title text-lg font-semibold mb-1">
              Chargement de l'analyse...
            </h3>
            <p className="text-sm text-ink3 max-w-md">
              Veuillez patienter pendant la récupération des analyses des agents.
            </p>
          </div>
        ) : agents.length === 0 ? (
          <p className="text-ink3 text-center">{t('common.loading')}</p>
        ) : !currentAgent ? (
          <p className="text-ink3">Cet agent n'a pas été exécuté pour ce projet (mode ou conditions non remplis).</p>
        ) : currentAgent.status === 'SKIPPED' ? (
          <p className="text-ink3">Cet agent n'est pas applicable à votre profil.</p>
        ) : currentAgent.status !== 'DONE' ? (
          <div className="text-ink3">
            <p>Statut : <strong>{currentAgent.status}</strong>. {currentAgent.errorMessage}</p>
            {currentAgent.status === 'ERROR' && (
              <button onClick={handleRegenerate} disabled={regenerating} className="btn-secondary text-sm mt-4 flex items-center gap-1.5">
                <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                Régénérer
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Action buttons ──────────────────────── */}
            <div className="flex justify-end gap-2 mb-4">
              {editing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAndValidate}
                    disabled={saving}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    <Save size={14} className={saving ? 'animate-spin' : ''} />
                    {saving ? 'Saving…' : 'Save & Validate'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleExportHtml}
                    disabled={exportingHtml}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                    title="Télécharger une page HTML autonome, consultable hors-ligne"
                  >
                    <Download size={14} className={exportingHtml ? 'animate-pulse' : ''} />
                    {exportingHtml ? 'Export…' : 'Télécharger (HTML)'}
                  </button>
                  <button
                    onClick={handleStartEdit}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button onClick={handleRegenerate} disabled={regenerating} className="btn-secondary text-sm flex items-center gap-1.5">
                    <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                    {regenerating ? 'Régénération…' : t('validation.regenerate')}
                  </button>
                  <button onClick={handleValidate} className="btn-primary text-sm">
                    <CheckCircle2 size={14} className="inline mr-1.5" />
                    {t('validation.validate')}
                  </button>
                </>
              )}
            </div>

            {/* ── Editing indicator ───────────────────── */}
            {editing && (
              <div className="mb-4 px-4 py-2.5 rounded-lg bg-orange/5 border border-orange/20 text-sm text-orangeDark flex items-center gap-2">
                <Pencil size={14} />
                <span><strong>Edit mode</strong> — Click on any text below to modify it. Click <strong>Save & Validate</strong> when done.</span>
              </div>
            )}

            {/* ── Content area (captured for export) ──── */}
            <div className="bg-white">
            {Visualization && displayOutput ? (
              <div ref={exportRef}>
                <Visualization
                  output={displayOutput}
                  editing={editing}
                  onOutputChange={handleOutputChange}
                />
              </div>
            ) : (
              <pre className="bg-paper2 p-4 rounded-lg text-xs overflow-auto max-h-[60vh]">
                {JSON.stringify(displayOutput, null, 2)}
              </pre>
            )}
            </div>
            <SourcesPanel sources={currentAgent?.sources} />
          </>
        )}
      </div>
    </div>
  );
}
