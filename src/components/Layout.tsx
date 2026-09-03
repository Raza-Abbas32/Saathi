import { type ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import AuthModal from '@/components/AuthModal';

interface LayoutProps {
  children: ReactNode;
}

/** Pages with dense forms/chat — get a stronger overlay for readability */
const FOCUSED_PAGES = [
  '/assistant',
  '/crop-recommendation',
  '/disease-detection',
  '/profile',
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);

  const isFocused = FOCUSED_PAGES.includes(location.pathname);

  useEffect(() => {
    const handler = () => setAuthModalOpen(true);
    window.addEventListener('saathi:auth-required', handler);
    return () => window.removeEventListener('saathi:auth-required', handler);
  }, []);

  // Lazy-load the background image so it doesn't block initial paint
  useEffect(() => {
    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.src = '/bg-field.jpg';
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* ── Crop-field background layer ── */}

      {/* Base fallback gradient — always visible, covers load failure */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-b from-saathi-800 via-saathi-700 to-saathi-900"
        aria-hidden="true"
      />

      {/* Background image — lazy-loaded, subtle zoom animation */}
      {bgLoaded && (
        <div
          className="fixed -inset-4 -z-10 bg-cover bg-center bg-no-repeat animate-bg-drift"
          style={{ backgroundImage: 'url(/bg-field.jpg)' }}
          aria-hidden="true"
        />
      )}

      {/* Light blur layer — softens detail without losing field identity */}
      <div
        className="fixed inset-0 -z-10 backdrop-blur-[6px]"
        aria-hidden="true"
      />

      {/* Dark overlay — lighter on homepage, stronger on form/chat pages */}
      <div
        className={`fixed inset-0 -z-10 transition-opacity duration-500 ${
          isFocused ? 'bg-saathi-900/60' : 'bg-saathi-900/35'
        }`}
        aria-hidden="true"
      />

      {/* Soft gradient wash for text readability */}
      <div
        className={`fixed inset-0 -z-10 transition-opacity duration-500 ${
          isFocused
            ? 'bg-gradient-to-b from-white/70 via-white/40 to-white/60'
            : 'bg-gradient-to-b from-white/50 via-white/20 to-white/40'
        }`}
        aria-hidden="true"
      />

      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
        {children}
      </main>
      <Footer />
      <BottomNav />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
