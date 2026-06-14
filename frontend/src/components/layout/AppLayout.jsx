import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { LogOut, Settings, LayoutDashboard, ShieldCheck, Globe } from 'lucide-react';
import { userApi } from '../../api';

export default function AppLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const logout = useAuthStore((s) => s.logout);
  const currentProject = useProjectStore((s) => s.current);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="bg-white border-b border-paper3 sticky top-0 z-30">
        <div className="container-wide flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="font-title text-xl font-bold text-orange">
              {t('nav.title', 'Stratège IA')}
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-paper2 text-ink' : ''}`
              }
            >
              <LayoutDashboard size={16} className="inline mr-1.5" />
              {t('nav.dashboard')}
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-paper2 text-ink' : ''}`
              }
            >
              <Settings size={16} className="inline mr-1.5" />
              {t('nav.settings')}
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'bg-paper2 text-ink' : ''}`
                }
              >
                <ShieldCheck size={16} className="inline mr-1.5" />
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden md:block text-sm text-ink3">
                {user.email}
              </span>
            )}
            <button
              onClick={async () => {
                const currentLang = user?.lang || 'fr';
                const newLang = currentLang === 'fr' ? 'en' : 'fr';
                try {
                  const { data } = await userApi.update({
                    firstName: user?.firstName,
                    lastName: user?.lastName,
                    lang: newLang,
                  });
                  setUser(data);
                } catch (err) {
                  console.error('Failed to update language', err);
                }
              }}
              className="btn-ghost flex items-center gap-1.5 px-2 py-1 text-sm text-ink3 hover:text-orange transition-colors font-semibold"
              title={t('nav.toggleLanguage', 'Changer de langue')}
            >
              <Globe size={16} />
              <span>{user?.lang === 'en' ? 'FR' : 'EN'}</span>
            </button>
            <button onClick={handleLogout} className="btn-ghost" title={t('nav.logout')}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
