import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user?.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-title text-2xl font-semibold mb-6">{t('auth.login')}</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            type="email"
            required
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            required
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('common.loading') : t('auth.loginCta')}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink3 text-center">
        Les comptes sont créés par votre administrateur.
      </p>
    </div>
  );
}
