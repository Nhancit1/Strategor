import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import {
  Users, FolderOpen, Coins, AlertTriangle, Plus, KeyRound, Trash2,
  ChevronDown, ChevronRight, X, ShieldCheck,
} from 'lucide-react';

const money = (usd) => `$${Number(usd ?? 0).toFixed(2)}`;

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent || 'bg-paper2 text-ink2'}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-title font-bold leading-none">{value}</div>
        <div className="text-xs text-ink3 mt-1">{label}</div>
      </div>
    </div>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-title text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="btn-ghost" aria-label="Fermer"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateUserForm({ onClose, onDone }) {
  const [form, setForm] = useState({ email: '', username: '', firstName: '', lastName: '', password: '', role: 'USER' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) { setError('Mot de passe initial : 8 caractères minimum.'); return; }
    setLoading(true);
    try {
      await adminApi.createUser(form);
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Création impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Email</label>
          <input type="email" required className="form-input" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label className="form-label">Username (optionnel)</label>
          <input type="text" className="form-input" value={form.username} onChange={set('username')} placeholder="Généré automatiquement" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Prénom</label>
          <input className="form-input" value={form.firstName} onChange={set('firstName')} />
        </div>
        <div>
          <label className="form-label">Nom</label>
          <input className="form-input" value={form.lastName} onChange={set('lastName')} />
        </div>
      </div>
      <div>
        <label className="form-label">Mot de passe temporaire</label>
        <input type="text" required className="form-input" value={form.password} onChange={set('password')} />
        <p className="form-help">L'utilisateur devra le changer à la première connexion.</p>
      </div>
      <div>
        <label className="form-label">Rôle</label>
        <select className="form-input" value={form.role} onChange={set('role')}>
          <option value="USER">Utilisateur</option>
          <option value="ADMIN">Administrateur</option>
        </select>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Création…' : 'Créer le compte'}
        </button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('8 caractères minimum.'); return; }
    setLoading(true);
    try {
      await adminApi.resetPassword(user.id, password);
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Réinitialisation impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-ink3">
        Nouveau mot de passe temporaire pour <strong className="text-ink">{user.email}</strong>.
        Ses sessions seront fermées et il devra le changer à la prochaine connexion.
      </p>
      <div>
        <label className="form-label">Nouveau mot de passe</label>
        <input type="text" required className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'En cours…' : 'Réinitialiser'}
        </button>
      </div>
    </form>
  );
}

function DeleteConfirm({ user, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await adminApi.deleteUser(user.id);
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
      setLoading(false);
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink2">
        Supprimer <strong>{user.email}</strong> ? Le compte sera désactivé et ses sessions fermées.
      </p>
      {error && <div className="form-error">{error}</div>}
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={confirm} disabled={loading} className="btn-danger flex-1">
          {loading ? 'Suppression…' : 'Supprimer'}
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({}); // userId -> { loading, projects, error }
  const [modal, setModal] = useState(null); // { type: 'create'|'reset'|'delete', user? }

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, us] = await Promise.all([adminApi.overview(), adminApi.users()]);
      setOverview(ov.data);
      setUsers(us.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleUser = async (userId) => {
    if (expanded[userId]) {
      setExpanded((p) => { const c = { ...p }; delete c[userId]; return c; });
      return;
    }
    setExpanded((p) => ({ ...p, [userId]: { loading: true, projects: [] } }));
    try {
      const { data } = await adminApi.userProjects(userId);
      setExpanded((p) => ({ ...p, [userId]: { loading: false, projects: data } }));
    } catch {
      setExpanded((p) => ({ ...p, [userId]: { loading: false, projects: [], error: true } }));
    }
  };

  const onModalDone = () => { setModal(null); load(); };

  return (
    <div className="container-wide py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-2xl font-bold flex items-center gap-2">
            <ShieldCheck size={22} className="text-orange" /> Administration
          </h1>
          <p className="text-ink3 text-sm mt-1">Utilisateurs, projets et coût IA.</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary">
          <Plus size={16} className="inline mr-1.5" /> Nouvel utilisateur
        </button>
      </div>

      {error && <div className="form-error mb-4">{error}</div>}

      {/* Overview */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Utilisateurs" value={overview.users} />
          <StatCard icon={FolderOpen} label="Projets" value={overview.projects} />
          <StatCard icon={Coins} label="Coût IA total" value={money(overview.costUsd)} accent="bg-orange/10 text-orange" />
          <StatCard
            icon={AlertTriangle}
            label={`Projets > ${money(overview.alertThresholdUsd)}`}
            value={overview.alerts}
            accent={overview.alerts > 0 ? 'bg-red-100 text-red-700' : 'bg-paper2 text-ink2'}
          />
        </div>
      )}

      {/* Users */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-ink3 text-sm">Chargement…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink3 border-b border-paper3">
                <th className="py-3 px-4 font-medium">Utilisateur</th>
                <th className="py-3 px-4 font-medium">Rôle</th>
                <th className="py-3 px-4 font-medium text-right">Projets</th>
                <th className="py-3 px-4 font-medium text-right">Coût IA</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  expanded={expanded[u.id]}
                  onToggle={() => toggleUser(u.id)}
                  onReset={() => setModal({ type: 'reset', user: u })}
                  onDelete={() => setModal({ type: 'delete', user: u })}
                />
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="py-6 px-4 text-ink3 text-center">Aucun utilisateur.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === 'create' && (
        <Modal title="Nouvel utilisateur" onClose={() => setModal(null)}>
          <CreateUserForm onClose={() => setModal(null)} onDone={onModalDone} />
        </Modal>
      )}
      {modal?.type === 'reset' && (
        <Modal title="Réinitialiser le mot de passe" onClose={() => setModal(null)}>
          <ResetPasswordForm user={modal.user} onClose={() => setModal(null)} onDone={onModalDone} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal title="Supprimer l'utilisateur" onClose={() => setModal(null)}>
          <DeleteConfirm user={modal.user} onClose={() => setModal(null)} onDone={onModalDone} />
        </Modal>
      )}
    </div>
  );
}

function UserRow({ user, expanded, onToggle, onReset, onDelete }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return (
    <>
      <tr className="border-b border-paper2 hover:bg-paper/40">
        <td className="py-3 px-4">
          <button onClick={onToggle} className="flex items-center gap-2 text-left">
            {expanded ? <ChevronDown size={15} className="text-ink3" /> : <ChevronRight size={15} className="text-ink3" />}
            <span>
              <span className="block font-medium text-ink">{name || user.email}</span>
              {name && <span className="block text-xs text-ink3">{user.email}</span>}
            </span>
          </button>
        </td>
        <td className="py-3 px-4">
          <span className={user.role === 'ADMIN' ? 'badge-pro' : 'badge-free'}>
            {user.role === 'ADMIN' ? 'Admin' : 'User'}
          </span>
        </td>
        <td className="py-3 px-4 text-right">{user.projectCount}</td>
        <td className="py-3 px-4 text-right font-medium">{money(user.costUsd)}</td>
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1">
            <button onClick={onReset} className="btn-ghost" title="Réinitialiser le mot de passe"><KeyRound size={15} /></button>
            <button onClick={onDelete} className="btn-ghost text-red-700" title="Supprimer"><Trash2 size={15} /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-paper/50">
          <td colSpan={5} className="px-4 py-3">
            {expanded.loading ? (
              <div className="text-ink3 text-xs">Chargement des projets…</div>
            ) : expanded.error ? (
              <div className="form-error">Impossible de charger les projets.</div>
            ) : expanded.projects.length === 0 ? (
              <div className="text-ink3 text-xs">Aucun projet.</div>
            ) : (
              <div className="space-y-1.5">
                {expanded.projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 text-xs bg-white border border-paper3 rounded-lg px-3 py-2">
                    <FolderOpen size={14} className="text-ink3 shrink-0" />
                    <span className="font-medium text-ink flex-1 truncate">{p.name}</span>
                    <span className="text-ink3">{p.status}</span>
                    {p.costAlert && (
                      <span className="badge-error" title="Coût élevé"><AlertTriangle size={11} className="inline" /></span>
                    )}
                    <span className="text-ink3">{p.tokens.toLocaleString()} tok</span>
                    <span className="font-medium text-ink w-16 text-right">{money(p.costUsd)}</span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
