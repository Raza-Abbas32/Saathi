import { Link, useLocation } from 'react-router-dom';
import { Home, ScanSearch, Store, MessageSquare, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/disease-detection', label: 'Detect', icon: ScanSearch },
  { to: '/marketplace', label: 'Market', icon: Store },
  { to: '/assistant', label: 'Saathi AI', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const handleProtectedClick = (e: React.MouseEvent, to: string) => {
    if (!user && to !== '/' && to !== '/profile') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('saathi:auth-required'));
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-saathi-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={(e) => handleProtectedClick(e, item.to)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? 'text-harvest-700'
                  : 'text-saathi-400 hover:text-saathi-600'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-harvest-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
