import { useEffect, useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { useAgentWebSocket } from '../../hooks/useWebSocket';
import { agentApi } from '../../api';
import LivePipeline from '../../components/viz/LivePipeline';

export default function AgentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { agents, fetchAgents, updateAgentFromWs, fetchProject, current, launchAnalysis, cancelAnalysis } = useProjectStore();
  const user = useAuthStore((s) => s.user);
  const userLang = user?.lang;

  useEffect(() => { fetchAgents(id); fetchProject(id); }, [id, fetchAgents, fetchProject, userLang]);

  // Re-poll all 5s as a fallback
  useEffect(() => {
    const interval = setInterval(() => fetchAgents(id), 5000);
    return () => clearInterval(interval);
  }, [id, fetchAgents]);

  const onWsEvent = useCallback((event) => updateAgentFromWs(event), [updateAgentFromWs]);
  useAgentWebSocket(id, onWsEvent);

  const handleRegenerate = useCallback(async (agentId) => {
    try {
      await agentApi.regenerate(id, agentId);
      fetchAgents(id);
    } catch (err) {
      console.error('Failed to regenerate', err);
    }
  }, [id, fetchAgents]);

  const [relaunchingAll, setRelaunchingAll] = useState(false);
  const handleRelaunchAll = async () => {
    if (relaunchingAll) return;
    setRelaunchingAll(true);
    try {
      await launchAnalysis(id, { phase: 'all' });
      fetchAgents(id);
    } catch (err) {
      console.error('Relaunch all failed:', err);
    } finally {
      setRelaunchingAll(false);
    }
  };
  const [cancelling, setCancelling] = useState(false);
  const handleCancelAnalysis = useCallback(async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelAnalysis(id);
      fetchAgents(id);
      fetchProject(id);
    } catch (err) {
      console.error('Failed to cancel analysis', err);
    } finally {
      setCancelling(false);
    }
  }, [id, cancelAnalysis, fetchAgents, fetchProject, cancelling]);

  const allDone = useMemo(
    () => agents.length > 0 && agents.every((a) => ['DONE', 'SKIPPED', 'ERROR'].includes(a.status)),
    [agents]
  );

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => navigate(`/projects/${id}/validate`), 1500);
      return () => clearTimeout(timer);
    }
  }, [allDone, id, navigate]);

  const doneCount = agents.filter((a) => a.status === 'DONE').length;
  const totalCount = agents.length || 17;
  const overallPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="container-wide py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-title text-3xl font-bold mb-1">{t('agents.title')}</h1>
          <p className="text-ink3">{t('agents.subtitle')}</p>
          {current?.name && (
            <p className="text-sm text-ink3 mt-1">
              Projet : <strong>{current.name}</strong>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {current?.status === 'ANALYZING' && (
            <button
              onClick={handleCancelAnalysis}
              disabled={cancelling}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors duration-200"
              title="Arrêter l'analyse en cours"
            >
              <XCircle size={14} />
              {cancelling ? 'Arrêt...' : "Arrêter l'analyse"}
            </button>
          )}
          <button
            onClick={handleRelaunchAll}
            disabled={relaunchingAll || current?.status === 'ANALYZING'}
            className="btn-secondary text-sm flex items-center gap-1.5"
            title="Relancer l'analyse complète du projet à tout moment"
          >
            <RefreshCw size={14} className={relaunchingAll ? 'animate-spin' : ''} />
            {relaunchingAll ? 'Relancement...' : 'Régénérer tout le projet'}
          </button>
          <button
            onClick={() => navigate(`/projects/${id}/validate`)}
            className="btn-primary text-sm font-semibold"
          >
            Accéder à la validation
          </button>
        </div>
      </div>

      {/* Global progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-ink3">Progression globale</span>
          <span className="font-semibold">{doneCount}/{totalCount} agents</span>
        </div>
        <div className="h-2 bg-paper2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange to-amber-400 rounded-full transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Live pipeline — status-colored nodes, progress bars on running agents,
          hover any node to reveal its downstream impact on the rest of the run */}
      <LivePipeline
        agents={agents}
        onRegenerate={handleRegenerate}
        onOpenValidation={() => navigate(`/projects/${id}/validate`)}
      />

      {/* Completion banner */}
      {allDone && (
        <div className="mt-8 rounded-2xl p-6 text-center bg-green-50 border-2 border-green-300">
          <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
          <p className="text-green-700 font-semibold text-lg">
            Analyse terminée — redirection vers la validation…
          </p>
        </div>
      )}
    </div>
  );
}
