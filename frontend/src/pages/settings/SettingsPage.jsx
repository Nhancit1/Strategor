import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { authApi, userApi } from '../../api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
    setMsg(t('settings.profileUpdated'));
  };

  const changePwd = async () => {
    try {
      await authApi.changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '' });
      setMsg(t('settings.passwordChanged'));
    } catch (e) {
      setMsg('✗ ' + (e.response?.data?.message || t('common.error')));
    }
  };

  const deleteAccount = async () => {
    if (!confirm(t('settings.deleteConfirm'))) return;
    await authApi.deleteAccount();
    await logout();
    navigate('/login');
  };

  return (
    <div className="container-narrow py-8">
      <h1 className="font-title text-3xl font-bold mb-6">{t('settings.title')}</h1>
      {msg && <div className="card p-3 mb-4 bg-paper2 text-sm">{msg}</div>}

      {/* Profil */}
      <div className="card p-6 mb-4">
        <h2 className="font-title text-xl font-semibold mb-4">{t('settings.profile')}</h2>
        <div className="space-y-3">
          <div>
            <label className="form-label">{t('settings.email')}</label>
            <input className="form-input" value={user?.email || ''} disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('settings.firstName')}</label>
              <input className="form-input" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            </div>
            <div>
              <label className="form-label">{t('settings.lastName')}</label>
              <input className="form-input" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">{t('settings.language')}</label>
            <select className="form-input" value={profile.lang} onChange={(e) => setProfile({ ...profile, lang: e.target.value })}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <button onClick={saveProfile} className="btn-primary">{t('common.save')}</button>
        </div>
      </div>

      {/* Sécurité */}
      <div className="card p-6 mb-4">
        <h2 className="font-title text-xl font-semibold mb-4">{t('settings.security')}</h2>
        <div className="space-y-3">
          <div>
            <label className="form-label">{t('settings.currentPassword')}</label>
            <input type="password" className="form-input" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
          </div>
          <div>
            <label className="form-label">{t('settings.newPassword')}</label>
            <input type="password" minLength={8} className="form-input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
          </div>
          <button onClick={changePwd} className="btn-secondary">{t('settings.changePassword')}</button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-red-200">
        <h2 className="font-title text-xl font-semibold mb-2 text-red-700">{t('settings.dangerZone')}</h2>
        <p className="text-sm text-ink3 mb-4">
          {t('settings.dangerDesc')}
        </p>
        <button onClick={deleteAccount} className="btn-danger">{t('settings.deleteAccount')}</button>
      </div>
    </div>
  );
}
