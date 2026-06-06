import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi, userApi } from '../../api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    lang: user?.lang || 'fr',
  });
  const [pwd, setPwd] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState(null);

  const saveProfile = async () => {
    const { data } = await userApi.update(profile);
    setUser(data);
    setMsg('✓ Profil mis à jour');
  };

  const changePwd = async () => {
    try {
      await authApi.changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '' });
      setMsg('✓ Mot de passe modifié');
    } catch (e) {
      setMsg('✗ ' + (e.response?.data?.message || 'Erreur'));
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return;
    await authApi.deleteAccount();
    await logout();
    navigate('/login');
  };

  return (
    <div className="container-narrow py-8">
      <h1 className="font-title text-3xl font-bold mb-6">Paramètres</h1>
      {msg && <div className="card p-3 mb-4 bg-paper2 text-sm">{msg}</div>}

      {/* Profil */}
      <div className="card p-6 mb-4">
        <h2 className="font-title text-xl font-semibold mb-4">Profil</h2>
        <div className="space-y-3">
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email || ''} disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Prénom</label>
              <input className="form-input" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Nom</label>
              <input className="form-input" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Langue</label>
            <select className="form-input" value={profile.lang} onChange={(e) => setProfile({ ...profile, lang: e.target.value })}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <button onClick={saveProfile} className="btn-primary">Enregistrer</button>
        </div>
      </div>

      {/* Sécurité */}
      <div className="card p-6 mb-4">
        <h2 className="font-title text-xl font-semibold mb-4">Sécurité</h2>
        <div className="space-y-3">
          <div>
            <label className="form-label">Mot de passe actuel</label>
            <input type="password" className="form-input" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Nouveau mot de passe</label>
            <input type="password" minLength={8} className="form-input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
          </div>
          <button onClick={changePwd} className="btn-secondary">Changer le mot de passe</button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-red-200">
        <h2 className="font-title text-xl font-semibold mb-2 text-red-700">Zone dangereuse</h2>
        <p className="text-sm text-ink3 mb-4">
          Supprimer votre compte est définitif et entraîne la suppression de tous vos projets (RGPD).
        </p>
        <button onClick={deleteAccount} className="btn-danger">Supprimer mon compte</button>
      </div>
    </div>
  );
}
