import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signInAsGuest } = useAuth();
  const [modalOpen, setModalOpen] = useState(true);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 rounded-xl bg-saathi-50 flex items-center justify-center mb-4 animate-pulse-soft overflow-hidden">
          <img src="/Logo/Logo.png" alt="Saathi" className="w-full h-full object-cover rounded-xl" />
        </div>
        <p className="text-saathi-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <p className="text-saathi-600 text-lg font-semibold mb-2">
            This feature requires sign-in
          </p>
          <p className="text-saathi-400 text-sm mb-4">
            Please sign in with Google to access this feature.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary"
          >
            Sign in to continue
          </button>
          <button
            onClick={() => signInAsGuest()}
            className="btn-secondary mt-2 w-auto px-6 py-2.5"
          >
            Continue as Guest Farmer
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-ghost mt-1"
          >
            Back to Home
          </button>
        </div>
        <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return <>{children}</>;
}
