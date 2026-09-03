import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  Home,
  ScanSearch,
  Sprout,
  LineChart,
  Store,
  MessageSquare,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Cloud,
  Tractor,
  Eye,
  CalendarCheck,
  BookOpen,
  Brain,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import WeatherDropdown from '@/components/WeatherDropdown';
import { getWeatherInfo } from '@/services/weather';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/disease-detection', label: 'Disease Detection', icon: ScanSearch },
  { to: '/crop-recommendation', label: 'Crop Advisor', icon: Sprout },
  { to: '/market-prices', label: 'Market Prices', icon: LineChart },
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/assistant', label: 'Saathi AI', icon: MessageSquare },
];

const protectedRoutes = [
  '/disease-detection',
  '/crop-recommendation',
  '/market-prices',
  '/marketplace',
  '/assistant',
  '/farm-watch',
  '/farm-plan',
  '/farm-memory',
  '/farm-intelligence',
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);

  // Navbar trigger badge: show temp if we have a cached weather result
  const [navBadge, setNavBadge] = useState<{ temp: number; icon: string } | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for both dropdowns (same pattern as original)
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (weatherRef.current && !weatherRef.current.contains(e.target as Node)) {
        setWeatherOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Populate trigger badge from cache on mount so it shows up instantly
  useEffect(() => {
    try {
      const raw = localStorage.getItem('saathi-weather-cache');
      if (!raw) return;
      const { data, savedAt } = JSON.parse(raw);
      // Only use if fresher than 30 min
      if (Date.now() - savedAt < 30 * 60 * 1000) {
        const info = getWeatherInfo(data.current.weatherCode);
        setNavBadge({ temp: data.current.temperature, icon: info.icon });
      }
    } catch { /* ignore */ }
  }, []);

  // Update badge whenever weather panel fetches new data
  useEffect(() => {
    const handle = (e: Event) => {
      const { temp, icon } = (e as CustomEvent<{ temp: number; icon: string }>).detail;
      setNavBadge({ temp, icon });
    };
    window.addEventListener('saathi:weather-updated', handle);
    return () => window.removeEventListener('saathi:weather-updated', handle);
  }, []);

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (protectedRoutes.includes(to) && !user) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('saathi:auth-required'));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setProfileOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const handleWeatherToggle = () => {
    setWeatherOpen((prev) => !prev);
    setProfileOpen(false);   // close the other dropdown
  };

  const userName = profile?.displayName ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Farmer';
  const userAvatar = profile?.avatarUrl ?? user?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-hero">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
            <div className="w-10 h-10 rounded-xl bg-saathi-50 flex items-center justify-center group-hover:bg-saathi-100 transition-colors overflow-hidden">
              <img src="/Logo/Logo.png" alt="Saathi logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-saathi-900 tracking-tight">
              Saathi
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => handleNavClick(e, link.to)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-saathi-700 text-white shadow-hero'
                      : 'text-saathi-700 hover:bg-saathi-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right-side controls */}
          <div className="flex items-center gap-2">

            {/* ── Weather trigger ── */}
            <div className="relative" ref={weatherRef}>
              <button
                onClick={handleWeatherToggle}
                aria-label="Weather"
                aria-expanded={weatherOpen}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  weatherOpen
                    ? 'bg-saathi-100 text-saathi-900'
                    : 'text-saathi-600 hover:bg-saathi-50 hover:text-saathi-900'
                }`}
              >
                {navBadge ? (
                  <>
                    <span className="text-base leading-none">{navBadge.icon}</span>
                    <span className="font-semibold text-saathi-900">{navBadge.temp}°C</span>
                  </>
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
              </button>

              {weatherOpen && (
                <WeatherDropdown
                  containerRef={weatherRef}
                  onClose={() => setWeatherOpen(false)}
                />
              )}
            </div>

            {/* ── Profile / Sign in ── */}
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setWeatherOpen(false); }}
                  className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-saathi-50 transition-colors"
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-saathi-500 text-white flex items-center justify-center text-sm font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-saathi-500 hidden sm:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 hero-box p-2 animate-slide-down shadow-hero-lg z-50">
                    <div className="px-3 py-2 border-b border-saathi-50 mb-1">
                      <p className="text-sm font-semibold text-saathi-900 truncate">{userName}</p>
                      <p className="text-xs text-saathi-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-saathi-700 hover:bg-saathi-50 transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-saathi-500" />
                        Profile
                      </Link>
                      <Link
                        to="/farm-profile"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-saathi-700 hover:bg-saathi-50 transition-colors"
                      >
                        <Tractor className="w-4 h-4 text-saathi-600" />
                        Farm Profile
                      </Link>
                    </div>

                    <div className="my-1 border-t border-saathi-50 pt-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-saathi-400">
                        Farm Intelligence
                      </div>
                      <Link
                        to="/farm-watch"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-saathi-700 hover:bg-saathi-50 transition-colors"
                      >
                        <Eye className="w-4 h-4 text-emerald-600" />
                        Saathi Farm Watch
                      </Link>
                      <Link
                        to="/farm-plan"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-saathi-700 hover:bg-saathi-50 transition-colors"
                      >
                        <CalendarCheck className="w-4 h-4 text-blue-600" />
                        Today's Farm Plan
                      </Link>
                      <Link
                        to="/farm-memory"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-saathi-700 hover:bg-saathi-50 transition-colors"
                      >
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        Farm Memory
                      </Link>
                      <Link
                        to="/farm-intelligence"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-saathi-700 hover:bg-saathi-50 transition-colors"
                      >
                        <Brain className="w-4 h-4 text-purple-600" />
                        Saathi Farm Intelligence
                      </Link>
                    </div>

                    <div className="my-1 border-t border-saathi-50 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/farm-profile"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-saathi-700 hover:bg-saathi-50 transition-colors"
                  title="My Farm Profile"
                >
                  <Tractor className="w-4 h-4 text-saathi-600" />
                  <span>My Farm</span>
                </Link>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('saathi:auth-required'))}
                  className="btn-primary text-sm hidden lg:inline-flex"
                >
                  Sign in
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-saathi-700 hover:bg-saathi-50 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 animate-slide-down">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={(e) => {
                      handleNavClick(e, link.to);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-saathi-700 text-white shadow-hero'
                        : 'text-saathi-700 hover:bg-saathi-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}

              <div className="my-2 border-t border-saathi-100 pt-2">
                <div className="px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-saathi-400">
                  Farm Operations & Intelligence
                </div>
                <Link
                  to="/farm-watch"
                  onClick={(e) => {
                    handleNavClick(e, '/farm-watch');
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-saathi-700 hover:bg-saathi-50 transition-colors"
                >
                  <Eye className="w-5 h-5 text-emerald-600" />
                  Saathi Farm Watch
                </Link>
                <Link
                  to="/farm-plan"
                  onClick={(e) => {
                    handleNavClick(e, '/farm-plan');
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-saathi-700 hover:bg-saathi-50 transition-colors"
                >
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                  Today's Farm Plan
                </Link>
                <Link
                  to="/farm-memory"
                  onClick={(e) => {
                    handleNavClick(e, '/farm-memory');
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-saathi-700 hover:bg-saathi-50 transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  Farm Memory
                </Link>
                <Link
                  to="/farm-intelligence"
                  onClick={(e) => {
                    handleNavClick(e, '/farm-intelligence');
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-saathi-700 hover:bg-saathi-50 transition-colors"
                >
                  <Brain className="w-5 h-5 text-purple-600" />
                  Saathi Farm Intelligence
                </Link>
              </div>

              <div className="my-1 border-t border-saathi-100 pt-1">
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-saathi-700 hover:bg-saathi-50 transition-colors"
                >
                  <UserIcon className="w-5 h-5" />
                  Profile
                </Link>
                <Link
                  to="/farm-profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-saathi-700 hover:bg-saathi-50 transition-colors"
                >
                  <Tractor className="w-5 h-5 text-saathi-600" />
                  Farm Profile
                </Link>
              </div>

              {!user && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    window.dispatchEvent(new CustomEvent('saathi:auth-required'));
                  }}
                  className="btn-primary mt-2 mx-4"
                >
                  Sign in
                </button>
              )}
              {user && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-1"
                >
                  <LogOut className="w-5 h-5" />
                  Log out
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
