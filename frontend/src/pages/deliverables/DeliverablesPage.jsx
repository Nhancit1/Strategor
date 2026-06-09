import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Presentation, FileSpreadsheet, File, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { exportApi, agentApi } from '../../api';
import DeliverablesView from '../../components/viz/DeliverablesView';

const FORMATS = [
  { id: 'pdf', label: 'PDF', icon: File, mime: 'application/pdf' },
  { id: 'docx', label: 'Word', icon: FileText, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { id: 'pptx', label: 'PowerPoint', icon: Presentation, mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
];

export default function DeliverablesPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { agents, fetchAgents, current, fetchProject } = useProjectStore();
  const [exporting, setExporting] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { fetchAgents(id); fetchProject(id); }, [id, fetchAgents, fetchProject]);

  const finalAgent = agents.find((a) => a.agentId === 8);

  const handleRegenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      await agentApi.regenerate(id, 8);
      const poll = setInterval(async () => {
        await fetchAgents(id);
        const updated = useProjectStore.getState().agents.find((a) => a.agentId === 8);
        if (updated && updated.status !== 'PENDING' && updated.status !== 'RUNNING') {
          clearInterval(poll);
          setRegenerating(false);
        }
      }, 3000);
    } catch {
      setRegenerating(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const { data } = await exportApi.download(id, format);
      const blob = new Blob([data], { type: FORMATS.find((f) => f.id === format).mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strategie-${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // When responseType is 'blob', error responses come back as Blob too.
      // Try to read the blob text to extract the actual error message.
      let serverMessage = '';
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          serverMessage = json.message || json.error || '';
        } else {
          serverMessage = err.response?.data?.message || '';
        }
      } catch {
        // ignore parse errors
      }
      const displayMsg = serverMessage || err.message || 'Erreur inconnue';
      const isConnectionError = displayMsg.includes('ECONNREFUSED') || displayMsg.includes('connect');
      alert(
        isConnectionError
          ? 'Export impossible : le service d\'export (Python) n\'est pas démarré. Lancez-le avec :\n\ncd ai-python && uvicorn app.main:app --reload --port 8000'
          : `Export en erreur : ${displayMsg}`
      );
    } finally {
      setExporting(null);
    }
  };


  return (
    <div className="container-wide py-8">
      <div className="mb-6">
        <h1 className="font-title text-3xl font-bold mb-1">{t('deliverables.title')}</h1>
        <p className="text-ink3">{t('deliverables.subtitle')}</p>
        {current?.name && <p className="text-sm text-ink3 mt-1">Projet : <strong>{current.name}</strong></p>}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-title text-xl font-semibold mb-4">Exports</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => handleExport(f.id)}
                disabled={exporting === f.id || !finalAgent || finalAgent.status !== 'DONE'}
                className="card p-5 text-center hover:shadow-cardHover transition-all disabled:opacity-50"
              >
                <Icon size={32} className="mx-auto mb-2 text-orange" />
                <div className="font-title font-semibold">{f.label}</div>
                <div className="text-xs text-ink3 mt-1">
                  {exporting === f.id ? 'Génération…' : <Download size={12} className="inline" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-title text-xl font-semibold">Aperçu — Livrables finaux</h2>
          {finalAgent && (finalAgent.status === 'ERROR' || finalAgent.status === 'DONE') && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
              Régénérer
            </button>
          )}
        </div>
        {!finalAgent ? (
          <div className="p-6 text-center">
            <p className="text-ink3 mb-4">Agent 8 (Livrables finaux) n'a pas encore été lancé.</p>
            <button onClick={handleRegenerate} disabled={regenerating} className="btn-primary flex items-center gap-2 mx-auto">
              <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
              Générer les livrables
            </button>
          </div>
        ) : finalAgent.status === 'RUNNING' || finalAgent.status === 'PENDING' || regenerating ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <Loader2 size={32} className="text-orange animate-spin mb-3" />
            <p className="font-semibold text-slate-700">Génération des livrables finaux en cours…</p>
            <p className="text-xs text-ink3 mt-1 max-w-md mx-auto">
              L'Agent 8 consolide toutes les analyses (SWOT, PESTEL, Porter, axes stratégiques, KPIs, etc.). Cela peut prendre 1 à 2 minutes.
            </p>
          </div>
        ) : finalAgent.status === 'ERROR' ? (
          <div className="p-6 border border-red-200 bg-red-50 rounded-xl">
            <div className="flex gap-3 items-start">
              <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-700 mb-1">Erreur de génération</h4>
                <p className="text-sm text-red-600 mb-3">
                  Une erreur est survenue lors de la production des livrables : {finalAgent.errorMessage || "Réponse invalide de l'assistant."}
                </p>
                <button onClick={handleRegenerate} disabled={regenerating} className="btn-primary text-sm flex items-center gap-2">
                  <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                  Réessayer la génération
                </button>
              </div>
            </div>
          </div>
        ) : (
          <DeliverablesView output={finalAgent.editedOutput || finalAgent.output} />
        )}
      </div>
    </div>
  );
}

