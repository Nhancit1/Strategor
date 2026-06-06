import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function ChangePasswordPage() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const mustChange = useAuthStore((s) => !!s.user?.mustChangePassword);
  const navigate = useNavigate();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (next !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next); // store updates tokens + user
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-title text-2xl font-semibold mb-2">Changer votre mot de passe</h2>
      <p className="text-ink3 text-sm mb-6">
        {mustChange
          ? 'Pour votre sécurité, définissez un nouveau mot de passe avant de continuer.'
          : 'Mettez à jour votre mot de passe.'}
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="current">Mot de passe actuel</label>
          <input
            id="current"
            type="password"
            required
            className="form-input"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="next">Nouveau mot de passe</label>
          <input
            id="next"
            type="password"
            required
            className="form-input"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <p className="form-help">8 caractères minimum.</p>
        </div>
        <div>
          <label className="form-label" htmlFor="confirm">Confirmer le nouveau mot de passe</label>
          <input
            id="confirm"
            type="password"
            required
            className="form-input"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </div>
  );
}
