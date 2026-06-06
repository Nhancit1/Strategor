import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { LogOut, Settings, LayoutDashboard, ShieldCheck } from 'lucide-react';

export default function AppLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="bg-white border-b border-paper3 sticky top-0 z-30">
        <div className="container-wide flex items-center justify-between h-16">
          <Link to="/dashboard" className="font-title text-xl font-bold text-orange">
            Stratège IA
          </Link>

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
