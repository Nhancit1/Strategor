import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../logo.jpeg';

export default function AuthLayout() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex">
      {/* Left : form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-paper">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <img src={logo} alt="Stratège IA" className="h-32 w-auto" />
          </div>
          <Outlet />
        </div>
      </div>

      {/* Right : visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange to-orangeDark items-center justify-center p-12">
        <div className="text-white max-w-md text-center">
          <h2 className="font-title text-3xl font-bold mb-4">
            La stratégie de votre entreprise, livrée en 30 minutes
          </h2>
          <p className="text-lg text-white/90">{t('auth.tagline')}</p>
        </div>
      </div>
    </div>
  );
}
