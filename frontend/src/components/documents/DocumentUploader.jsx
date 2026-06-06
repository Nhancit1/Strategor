import { useEffect, useState } from 'react';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { documentApi } from '../../api';

const DOC_TYPES = [
  { value: 'financial', label: '💰 Financier (bilan, P&L)' },
  { value: 'commercial', label: '🛒 Commercial (catalogue, plaquette)' },
  { value: 'strategy', label: '🎯 Stratégie (deck, vision)' },
  { value: 'other', label: '📄 Autre' },
];

const STATUS_LABEL = {
  PENDING: '⏳ En attente',
  PARSING: '🔄 Analyse…',
  DONE: '✓ Lu',
  ERROR: '❌ Erreur',
};

const MAX_FILES = 5;
const MAX_MB = 25;

export default function DocumentUploader({ projectId, compact = false }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocs = async () => {
    try {
      const { data } = await documentApi.list(projectId);
      setDocs(data || []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (projectId) fetchDocs();
  }, [projectId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${MAX_MB} MB)`);
      return;
    }
    if (docs.length >= MAX_FILES) {
      setError(`Limite atteinte (${MAX_FILES} documents max par projet)`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await documentApi.upload(projectId, file, 'other');
      await fetchDocs();
      // Re-poll every 2s if any doc is parsing
      const pollInterval = setInterval(async () => {
        const { data } = await documentApi.list(projectId);
        setDocs(data || []);
        if (!data?.some((d) => d.parseStatus === 'PENDING' || d.parseStatus === 'PARSING')) {
          clearInterval(pollInterval);
        }
      }, 2000);
      // Failsafe stop after 30s
      setTimeout(() => clearInterval(pollInterval), 30000);
    } catch (e2) {
      setError(e2.response?.data?.message || 'Échec upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId) => {
    try {
      await documentApi.remove(projectId, docId);
      await fetchDocs();
    } catch {
      setError('Échec suppression');
    }
  };

  return (
    <div className={compact ? '' : 'card'}>
      {!compact && (
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-title font-semibold">📑 Documents</h4>
            <p className="text-ink3 text-sm">
              Bilans, plaquettes, deck… (max {MAX_FILES} fichiers · {MAX_MB} MB)
            </p>
          </div>
          <span className="badge bg-paper2 text-ink3 text-xs">
            {docs.length} / {MAX_FILES}
          </span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
          {error}
        </div>
      )}

      <div className="space-y-2 mb-3">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center gap-2 p-2 bg-paper2 rounded-lg text-sm">
            <FileText size={16} className="text-ink3 flex-shrink-0" />
            <span className="flex-1 truncate">{doc.filename}</span>
            <span className="text-xs text-ink3 whitespace-nowrap">
              {STATUS_LABEL[doc.parseStatus] || doc.parseStatus}
            </span>
            <button
              onClick={() => handleDelete(doc.id)}
              className="text-ink3 hover:text-red-600 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <label
        className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm ${
          uploading
            ? 'border-orange bg-orange/5 cursor-wait'
            : 'border-paper3 hover:border-orange hover:bg-orange/5'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Upload en cours…
          </>
        ) : (
          <>
            <Upload size={16} />
            {docs.length === 0 ? 'Glisse ou clique pour ajouter un document' : 'Ajouter un document'}
          </>
        )}
        <input
          type="file"
          className="hidden"
          accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.csv"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
