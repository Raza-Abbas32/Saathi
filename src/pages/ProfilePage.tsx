import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  LogOut,
  Trash2,
  Info,
  Loader2,
  Check,
  Pencil,
  Shield,
  Eye,
  CalendarCheck,
  BookOpen,
  Brain,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import FarmProfileForm from '@/components/FarmProfileForm';
import { clearFarmContext } from '@/services/farmContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, signOut, updateDisplayName, deleteMyData } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
  }, [profile]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-saathi-600 text-lg font-semibold mb-2">
          Please sign in to view your profile
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('saathi:auth-required'))}
          className="btn-primary mt-2"
        >
          Sign in
        </button>
      </div>
    );
  }

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await updateDisplayName(displayName.trim());
      setEditingName(false);
      setMessage('Name updated successfully');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage('Could not save name. Please try again.');
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(false);
  };

  const handleDeleteData = async () => {
    setDeleting(true);
    try {
      clearFarmContext();
      await deleteMyData();
      await signOut();
      navigate('/');
    } catch {
      setMessage('Could not delete data. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const avatarUrl = profile?.avatarUrl ?? user?.user_metadata?.avatar_url;
  const name = profile?.displayName ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Farmer';
  const authMethod = user?.app_metadata?.provider ?? 'email';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Profile header card */}
      <div className="hero-card">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-saathi-50"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-saathi-500 text-white flex items-center justify-center text-2xl font-bold ring-4 ring-saathi-50">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            {editingName ? (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Your display name"
                  maxLength={50}
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="btn-primary px-3 py-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-xl font-bold text-saathi-900">{name}</h2>
                <button
                  onClick={() => { setEditingName(true); setDisplayName(name); }}
                  className="text-saathi-400 hover:text-saathi-600 transition-colors"
                  aria-label="Edit name"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 justify-center sm:justify-start mt-1 text-saathi-500 text-sm">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </div>
            <div className="flex items-center gap-1.5 justify-center sm:justify-start mt-1 text-saathi-400 text-xs">
              <Shield className="w-3 h-3" />
              Signed in via {authMethod === 'google' ? 'Google' : 'Email'}
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-4 text-sm text-saathi-600 bg-saathi-50 rounded-lg px-3 py-2 text-center">
            {message}
          </div>
        )}
      </div>

      {/* Farm Intelligence & Operations Hub */}
      <div className="hero-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-saathi-900 text-lg">Farm Intelligence & Tools</h3>
          <span className="text-xs text-saathi-500 font-medium">Daily Farm Control</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Link
            to="/farm-watch"
            className="p-3.5 rounded-xl border border-saathi-100 hover:border-saathi-300 bg-white/70 hover:bg-saathi-50/60 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-saathi-900 group-hover:text-saathi-700">
                  Saathi Farm Watch
                </p>
                <p className="text-xs text-saathi-500">Daily brief & field alerts</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-saathi-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/farm-plan"
            className="p-3.5 rounded-xl border border-saathi-100 hover:border-saathi-300 bg-white/70 hover:bg-saathi-50/60 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-saathi-900 group-hover:text-saathi-700">
                  Today's Farm Plan
                </p>
                <p className="text-xs text-saathi-500">Optimal weather windows</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-saathi-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/farm-memory"
            className="p-3.5 rounded-xl border border-saathi-100 hover:border-saathi-300 bg-white/70 hover:bg-saathi-50/60 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-saathi-900 group-hover:text-saathi-700">
                  Farm Memory
                </p>
                <p className="text-xs text-saathi-500">Field logs & outcome history</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-saathi-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/farm-intelligence"
            className="p-3.5 rounded-xl border border-saathi-100 hover:border-saathi-300 bg-white/70 hover:bg-saathi-50/60 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-saathi-900 group-hover:text-saathi-700">
                  Farm Intelligence
                </p>
                <p className="text-xs text-saathi-500">Decision engine & lifecycle</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-saathi-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Farm Profile / Farm Memory Section */}
      <FarmProfileForm showCardWrapper={true} />

      {/* About section */}
      <div className="hero-card">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-saathi-500" />
          <h3 className="font-semibold text-saathi-900 text-lg">About Saathi</h3>
        </div>
        <p className="text-saathi-600 text-sm leading-relaxed">
          Saathi is an AI-powered smart agriculture platform built for Pakistani farmers.
          It provides five core tools: crop disease detection, crop recommendations, market
          price insights, a peer-to-peer marketplace, and an AI farming assistant. Saathi
          helps you make better decisions, protect your crops, and earn more from your land.
        </p>
      </div>

      {/* Account actions */}
      <div className="hero-card">
        <h3 className="font-semibold text-saathi-900 text-lg mb-2">Account</h3>

        <button
          onClick={() => signOut().then(() => navigate('/'))}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-saathi-700 hover:bg-saathi-50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-saathi-500" />
          <span className="font-medium">Log out</span>
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
          <span className="font-medium">Delete My Data</span>
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div className="absolute inset-0 bg-saathi-900/50 backdrop-blur-sm" />
          <div
            className="relative hero-box p-8 max-w-md w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-saathi-900 text-center mb-2">
              Delete all your data?
            </h3>
            <p className="text-saathi-600 text-sm text-center mb-6">
              This will permanently delete your disease analyses, crop recommendations,
              marketplace listings, and chat history. This action cannot be undone.
              You will also be signed out.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-red-600 active:scale-95 transition-all disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
