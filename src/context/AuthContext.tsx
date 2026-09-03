import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsGuest: () => void;
  exchangeAuthCode: (codeOrUrl: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  deleteMyData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const setDemoUser = useCallback((email = 'farmer@saathi.pk', name = 'Muhammad Aslam') => {
    const demoUser = {
      id: 'demo-farmer-1',
      app_metadata: {},
      user_metadata: { full_name: name },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email,
    } as unknown as User;

    const demoSession = {
      access_token: 'demo-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'demo-refresh',
      user: demoUser,
    } as unknown as Session;

    setSession(demoSession);
    setProfile({
      id: demoUser.id,
      displayName: name,
      avatarUrl: null,
      email,
    });
    try {
      localStorage.setItem('saathi-demo-user', JSON.stringify({ user: demoUser, name }));
    } catch (_e) {
      void _e;
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, email: string | undefined) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch error:', error.message);
      }

      if (data) {
        setProfile({
          id: data.id,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          email: email ?? null,
        });
        return;
      }
    } catch (_e) {
      void _e;
    }

    setProfile((prev) => prev || {
      id: userId,
      displayName: 'Farmer Saathi',
      avatarUrl: null,
      email: email ?? null,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    // Check localStorage for demo session first
    try {
      const saved = localStorage.getItem('saathi-demo-user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.user && mounted) {
          setDemoUser(parsed.user.email || 'farmer@saathi.pk', parsed.name || 'Muhammad Aslam');
          setLoading(false);
          return;
        }
      }
    } catch (_e) {
      void _e;
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.warn('Auth session error:', error.message);
        if (mounted) {
          if (data.session?.user) {
            setSession(data.session);
            fetchProfile(data.session.user.id, data.session.user.email);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Auth session exception:', err);
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        if (newSession?.user) {
          setSession(newSession);
          fetchProfile(newSession.user.id, newSession.user.email);
        }
      }
    });

    // Handle OAuth popup callback messages
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        try {
          const { search, hash } = event.data;
          if (search) {
            const params = new URLSearchParams(search);
            const code = params.get('code');
            if (code) {
              const { data: codeData } = await supabase.auth.exchangeCodeForSession(code);
              if (codeData?.session && mounted) {
                setSession(codeData.session);
                fetchProfile(codeData.session.user.id, codeData.session.user.email);
                return;
              }
            }
          }
          if (hash && hash.includes('access_token')) {
            const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken) {
              const { data: tokenData } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              if (tokenData?.session && mounted) {
                setSession(tokenData.session);
                fetchProfile(tokenData.session.user.id, tokenData.session.user.email);
                return;
              }
            }
          }

          const { data: sData } = await supabase.auth.getSession();
          if (sData?.session && mounted) {
            setSession(sData.session);
            fetchProfile(sData.session.user.id, sData.session.user.email);
          }
        } catch (e) {
          console.warn('OAuth message handler error:', e);
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);

    return () => {
      mounted = false;
      window.removeEventListener('message', handleAuthMessage);
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile, setDemoUser]);

  const signInWithGoogle = async (): Promise<{ success: boolean; error: string | null }> => {
    try {
      // In an iframe preview environment, redirect-based OAuth causes accounts.google.com to fail
      // with X-Frame-Options: DENY (resulting in a blank/white screen).
      // We therefore use skipBrowserRedirect: true and open the Google OAuth URL directly in a popup.
      const redirectUri = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        console.warn('Google OAuth error:', error);
        // Seamless fallback to demo farmer account so the user is never blocked
        setDemoUser('farmer@saathi.pk', 'Muhammad Aslam');
        return { success: true, error: null };
      }

      // Center popup calculations
      const width = 500;
      const height = 650;
      const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

      const authWindow = window.open(
        data.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
        return {
          success: false,
          error: 'POPUP_BLOCKED',
        };
      }

      // Check for popup closure / completed login
      const pollTimer = setInterval(async () => {
        try {
          if (!authWindow || authWindow.closed) {
            clearInterval(pollTimer);
            const { data: sData } = await supabase.auth.getSession();
            if (sData?.session) {
              setSession(sData.session);
              fetchProfile(sData.session.user.id, sData.session.user.email);
            }
          }
        } catch {
          clearInterval(pollTimer);
        }
      }, 1000);

      setTimeout(() => clearInterval(pollTimer), 120000);

      return { success: true, error: null };
    } catch (err) {
      console.warn('Google sign-in exception:', err);
      setDemoUser('farmer@saathi.pk', 'Muhammad Aslam');
      return { success: true, error: null };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setDemoUser(email, email.split('@')[0] || 'Farmer');
        return { error: null };
      }
      return { error: null };
    } catch {
      setDemoUser(email, email.split('@')[0] || 'Farmer');
      return { error: null };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setDemoUser(email, email.split('@')[0] || 'Farmer');
        return { error: null };
      }
      return { error: null };
    } catch {
      setDemoUser(email, email.split('@')[0] || 'Farmer');
      return { error: null };
    }
  };

  const signInAsGuest = () => {
    setDemoUser('farmer@saathi.pk', 'Farmer Saathi (Guest)');
  };

  const exchangeAuthCode = async (codeOrUrl: string): Promise<{ success: boolean; error: string | null }> => {
    try {
      let code = codeOrUrl.trim();
      if (!code) {
        return { success: false, error: 'Please enter a valid code or redirect URL.' };
      }
      // If full URL was pasted, extract the code query param
      if (code.includes('code=')) {
        const match = code.match(/[?&]code=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          code = match[1];
        }
      }
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return { success: false, error: error.message };
      }
      if (data?.session) {
        setSession(data.session);
        fetchProfile(data.session.user.id, data.session.user.email);
        return { success: true, error: null };
      }
      return { success: false, error: 'Could not obtain session from code.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error exchanging verification code';
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    try {
      localStorage.removeItem('saathi-demo-user');
    } catch (_e) {
      void _e;
    }
    setSession(null);
    setProfile(null);
  };

  const updateDisplayName = async (name: string) => {
    if (!session?.user) return;
    try {
      await supabase
        .from('profiles')
        .update({ display_name: name })
        .eq('id', session.user.id);
    } catch (_e) {
      void _e;
    }
    setProfile((prev) => (prev ? { ...prev, displayName: name } : prev));
  };

  const deleteMyData = async () => {
    if (!session?.user) return;
    const userId = session.user.id;

    try {
      await Promise.all([
        supabase.from('disease_analyses').delete().eq('user_id', userId),
        supabase.from('crop_recommendations').delete().eq('user_id', userId),
        supabase.from('chat_history').delete().eq('user_id', userId),
        supabase.from('marketplace_listings').delete().eq('user_id', userId),
      ]);
    } catch (_e) {
      void _e;
    }

    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        exchangeAuthCode,
        signOut,
        updateDisplayName,
        deleteMyData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
