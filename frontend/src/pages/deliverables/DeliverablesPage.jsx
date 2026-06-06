import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Presentation, FileSpreadsheet, File } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { exportApi } from '../../api';

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

  useEffect(() => { fetchAgents(id); fetchProject(id); }, [id, fetchAgents, fetchProject]);

  const finalAgent = agents.find((a) => a.agentId === 8);

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
      alert('Export en erreur (les exports nécessitent les tracks F/H mergés). ' + (err.response?.data?.message || err.message));
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
                disabled={exporting === f.id}
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
        <h2 className="font-title text-xl font-semibold mb-4">Aperçu — Livrables finaux</h2>
        {!finalAgent || finalAgent.status !== 'DONE' ? (
          <p className="text-ink3">Agent 8 (Livrables finaux) pas encore terminé.</p>
        ) : (
          <pre className="bg-paper2 p-4 rounded-lg text-xs overflow-auto max-h-[60vh]">
            {JSON.stringify(finalAgent.output, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
