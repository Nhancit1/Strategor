import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RefreshCw, Pencil, X, Save, Loader2, Download, FileText } from 'lucide-react';
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
  { id: 'risks', agentId: 13, label: 'Risques', Component: RiskMatrix },
  { id: 'finance', agentId: 14, label: 'Finance', Component: FinanceScenarios },
  { id: 'review', agentId: 15, label: 'Cohérence', Component: ConsistencyView },
  { id: 'partner', agentId: 16, label: 'Revue Associé', Component: PartnerReviewView },
];

export default function ValidationPage() {
  const { id, tab } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { agents, fetchAgents, agentsLoading, current, fetchProject } = useProjectStore();
  const user = useAuthStore((s) => s.user);
  const userLang = user?.lang;
  const [activeTab, setActiveTab] = useState(tab || TABS[0].id);
  const [regenerating, setRegenerating] = useState(false);
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(null);

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

  // Export the currently-visualised page (exact on-screen design) to PDF / Word.
  const handleExport = async (format) => {
    if (!exportRef.current || exporting) return;
    setExporting(format);
    try {
      const label = TABS.find((tt) => tt.id === activeTab)?.label || 'rapport';
      const safe = `${(current?.name || 'strategor')}-${label}`.replace(/[^\w.-]+/g, '_');
      const { exportViewToPdf, exportViewToDocx } = await import('../../utils/exportView');
      if (format === 'pdf') {
        await exportViewToPdf(exportRef.current, `${safe}.pdf`);
      } else {
        await exportViewToDocx(exportRef.current, `${safe}.docx`, `${current?.name || ''} — ${label}`);
      }
    } catch (e) {
      console.error('Export failed', e);
      alert("L'export a échoué. Veuillez réessayer.");
    } finally {
      setExporting(null);
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
        {allValidated && (
          <Link to={`/projects/${id}/deliverables`} className="btn-primary">
            Voir les livrables →
          </Link>
        )}
      </div>

      <ConsistencyReport
        report={current?.consistencyReport}
        onOpenReview={() => onSelectTab('review')}
      />

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
                  <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="btn-secondary text-sm flex items-center gap-1.5">
                    <Download size={14} className={exporting === 'pdf' ? 'animate-spin' : ''} />
                    {exporting === 'pdf' ? 'Export…' : 'PDF'}
                  </button>
                  <button onClick={() => handleExport('docx')} disabled={!!exporting} className="btn-secondary text-sm flex items-center gap-1.5">
                    <FileText size={14} className={exporting === 'docx' ? 'animate-spin' : ''} />
                    {exporting === 'docx' ? 'Export…' : 'Word'}
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
            <div ref={exportRef} className="bg-white">
            {Visualization && displayOutput ? (
              <Visualization
                output={displayOutput}
                editing={editing}
                onOutputChange={handleOutputChange}
              />
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
