import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';

function ProjectCard({ p, statusRoute, statusLabel, deleteProject, updateProject }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEdit = (e) => {
    e.preventDefault();
    setEditName(p.name);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editName.trim() && editName !== p.name) {
      try {
        await updateProject(p.id, { name: editName.trim() });
      } catch (err) {
        console.error('Failed to update', err);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setIsEditing(false);
  };

  return (
    <div className="card p-5 flex flex-col group">
      <Link to={statusRoute(p)} className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              onClick={(e) => e.preventDefault()}
              className="font-title font-semibold text-lg bg-white border border-orange-300 text-ink rounded-md focus:outline-none focus:ring-2 focus:ring-orange/50 w-full px-1 py-0.5"
            />
          ) : (
            <>
              <h3 className="font-title font-semibold text-lg truncate flex-1">{p.name}</h3>
              <button 
                onClick={handleStartEdit}
                className="opacity-0 group-hover:opacity-100 p-1 text-ink3 hover:text-orange transition-all flex-shrink-0"
                title="Renommer le projet"
              >
                <Pencil size={14} />
              </button>
            </>
          )}
        </div>
        <p className="text-sm text-ink3 mb-3">{statusLabel(p.status)}</p>
        <p className="text-xs text-ink3">
          Mode : <span className="font-medium">{p.analysisMode || 'standard'}</span>
        </p>
      </Link>
      <div className="mt-4 pt-4 border-t border-paper3 flex justify-between items-center">
        <Link to={statusRoute(p)} className="text-sm text-orange hover:underline">
          Continuer →
        </Link>
        <button
          onClick={() => { if (confirm(`Supprimer "${p.name}" ?`)) deleteProject(p.id); }}
          className="text-ink3 hover:text-red-600 transition-colors"
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, loading, fetchProjects, createProject, deleteProject, updateProject } = useProjectStore();
  const user = useAuthStore((s) => s.user);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const project = await createProject({ name: 'Nouveau projet' });
      navigate(`/projects/${project.id}/onboarding`);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.network'));
    } finally {
      setCreating(false);
    }
  };

  const statusLabel = (s) => ({
    ONBOARDING: 'Profil en cours',
    ANALYZING: 'Analyse en cours',
    PROFILE_REVIEW: 'Hypothèses à valider',
    DIAGNOSTIC_REVIEW: 'Diagnostic à valider',
    VALIDATING: 'À valider',
    DONE: 'Terminé',
    FAILED: 'Échec',
  }[s] || s);

  const statusRoute = (project) => {
    switch (project.status) {
      case 'ONBOARDING': return `/projects/${project.id}/onboarding`;
      case 'ANALYZING': return `/projects/${project.id}/agents`;
      case 'PROFILE_REVIEW': return `/projects/${project.id}/hypotheses`;
      case 'DIAGNOSTIC_REVIEW': return `/projects/${project.id}/diagnostic-review`;
      case 'VALIDATING': return `/projects/${project.id}/validate`;
      case 'DONE': return `/projects/${project.id}/deliverables`;
      default: return `/projects/${project.id}/onboarding`;
    }
  };

  return (
    <div className="container-wide py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-title text-3xl font-bold">{t('dashboard.title')}</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn-primary"
        >
          <Plus size={16} className="inline mr-1.5" />
          {t('dashboard.newProject')}
        </button>
      </div>

      {error && <div className="card p-4 mb-4 bg-red-50 border-red-200 text-red-700">{error}</div>}

      {loading ? (
        <div className="text-ink3">{t('common.loading')}</div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-ink3 mb-6">{t('dashboard.noProjects')}</p>
          <button onClick={handleCreate} disabled={creating} className="btn-primary">
            {t('dashboard.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard 
              key={p.id} 
              p={p} 
              statusRoute={statusRoute} 
              statusLabel={statusLabel} 
              deleteProject={deleteProject} 
              updateProject={updateProject} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
