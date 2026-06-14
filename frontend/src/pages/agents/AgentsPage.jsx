import { useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, AlertCircle, Loader2, Circle, SkipForward,
  Brain, TrendingUp, BarChart2, Users, Target, Layers,
  Activity, FileText, Shield, GitBranch, PieChart, Repeat,
  RefreshCw
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { useAgentWebSocket } from '../../hooks/useWebSocket';
import { agentApi } from '../../api';

const AGENT_META = {
  1:  { label: 'Profil & Contexte',          icon: Brain,      color: 'text-violet-500',  bg: 'bg-violet-50' },
  2:  { label: 'Analyse PESTEL',              icon: TrendingUp, color: 'text-blue-500',    bg: 'bg-blue-50' },
  3:  { label: 'Analyse SWOT',                icon: BarChart2,  color: 'text-emerald-500', bg: 'bg-emerald-50' },
  4:  { label: 'Intelligence compétitive',    icon: Users,      color: 'text-orange-500',  bg: 'bg-orange-50' },
  5:  { label: 'Diagnostic consolidé',        icon: Layers,     color: 'text-red-500',     bg: 'bg-red-50' },
  6:  { label: 'Axes stratégiques',           icon: Target,     color: 'text-yellow-500',  bg: 'bg-yellow-50' },
  7:  { label: 'KPIs & tableau de bord',      icon: Activity,   color: 'text-cyan-500',    bg: 'bg-cyan-50' },
  8:  { label: 'Livrables finaux',            icon: FileText,   color: 'text-pink-500',    bg: 'bg-pink-50' },
  9:  { label: 'Forces de Porter',            icon: Shield,     color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  10: { label: 'Chaîne de valeur',            icon: GitBranch,  color: 'text-teal-500',    bg: 'bg-teal-50' },
  11: { label: 'Matrice BCG',                 icon: PieChart,   color: 'text-amber-500',   bg: 'bg-amber-50' },
  12: { label: 'Conduite du changement',      icon: Repeat,     color: 'text-rose-500',    bg: 'bg-rose-50' },
  13: { label: 'Registre de risques',         icon: AlertCircle,color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
  14: { label: 'Analyse financière',          icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  15: { label: 'Contrôle de cohérence',       icon: CheckCircle2,color: 'text-sky-500',    bg: 'bg-sky-50' },
};

const STATUS_RING = {
  PENDING:  'border-gray-200 bg-white',
  RUNNING:  'border-orange-400 bg-orange-50 shadow-[0_0_0_4px_rgba(251,146,60,0.15)]',
  DONE:     'border-green-400 bg-green-50',
  ERROR:    'border-red-400 bg-red-50',
  SKIPPED:  'border-gray-200 bg-gray-50',
};

export default function AgentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { agents, fetchAgents, updateAgentFromWs, fetchProject, current } = useProjectStore();
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

  const sorted = [...agents].sort((a, b) => a.agentId - b.agentId);

  const doneCount = agents.filter((a) => a.status === 'DONE').length;
  const totalCount = agents.length || 15;
  const overallPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="container-wide py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-title text-3xl font-bold mb-1">{t('agents.title')}</h1>
        <p className="text-ink3">{t('agents.subtitle')}</p>
        {current?.name && (
          <p className="text-sm text-ink3 mt-1">
            Projet : <strong>{current.name}</strong>
          </p>
        )}

        {/* Global progress bar */}
        <div className="mt-4">
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
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(AGENT_META).map(([agentIdStr]) => {
          const agentId = parseInt(agentIdStr, 10);
          const meta = AGENT_META[agentId];
          const agent = sorted.find((a) => a.agentId === agentId) || {
            agentId,
            status: 'PENDING',
            progressPercent: 0,
          };

          const Icon = meta.icon;
          const isRunning = agent.status === 'RUNNING';
          const isDone    = agent.status === 'DONE';
          const isError   = agent.status === 'ERROR';
          const isSkipped = agent.status === 'SKIPPED';

          return (
            <div
              key={agentId}
              className={`relative rounded-2xl border-2 p-5 transition-all duration-300 ${STATUS_RING[agent.status]}`}
            >
              {/* Running pulse ring */}
              {isRunning && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500" />
                </span>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${meta.bg}`}>
                  <Icon size={22} className={meta.color} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-title font-semibold text-sm leading-tight">
                      <span className="text-ink3 font-normal">#{agentId} </span>{meta.label}
                    </p>

                    {/* Status badge */}
                    {isDone && (
                      <CheckCircle2 size={18} className="flex-shrink-0 text-green-500" />
                    )}
                    {isError && (
                      <AlertCircle size={18} className="flex-shrink-0 text-red-500" />
                    )}
                    {isSkipped && (
                      <SkipForward size={18} className="flex-shrink-0 text-gray-400" />
                    )}
                    {isRunning && (
                      <Loader2 size={18} className="flex-shrink-0 text-orange-500 animate-spin" />
                    )}
                    {agent.status === 'PENDING' && (
                      <Circle size={18} className="flex-shrink-0 text-gray-300" />
                    )}
                  </div>

                  {/* Status text */}
                  <p className={`text-xs mt-0.5 ${
                    isRunning ? 'text-orange-600 font-medium' :
                    isDone    ? 'text-green-600' :
                    isError   ? 'text-red-600' :
                    isSkipped ? 'text-gray-400' :
                    'text-gray-400'
                  }`}>
                    {isRunning ? 'En cours…' :
                     isDone    ? 'Terminé' :
                     isError   ? 'Erreur' :
                     isSkipped ? 'Non applicable' :
                     'En attente'}
                  </p>

                  {/* Progress bar (running only) */}
                  {isRunning && (
                    <div className="mt-2 h-1 bg-orange-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full transition-all duration-500"
                        style={{ width: `${agent.progressPercent || 30}%` }}
                      />
                    </div>
                  )}

                  {/* Done progress bar at 100% */}
                  {isDone && (
                    <div className="mt-2 h-1 bg-green-100 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-green-400 rounded-full" />
                    </div>
                  )}

                  {/* Error message */}
                  {isError && (
                    <div className="mt-2">
                      <p className="text-xs text-red-500 line-clamp-2 mb-2">{agent.errorMessage}</p>
                      <button
                        onClick={async () => {
                          try {
                            await agentApi.regenerate(projectId, agentId);
                            fetchAgents();
                          } catch (err) {
                            console.error('Failed to regenerate', err);
                          }
                        }}
                        className="btn-secondary text-xs px-2 py-1 flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} />
                        Régénérer cet agent
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
