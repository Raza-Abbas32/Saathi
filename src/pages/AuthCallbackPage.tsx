import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const search = window.location.search;
        const hash = window.location.hash;
        const fullUrl = window.location.href;

        // Check if there is an auth code to exchange
        const params = new URLSearchParams(search);
        const code = params.get('code');
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            console.warn('exchangeCodeForSession in callback page:', e);
          }
        }

        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'SUPABASE_AUTH_SUCCESS',
              url: fullUrl,
              search,
              hash,
            },
            '*'
          );
          setStatus('success');
          setTimeout(() => {
            try {
              window.close();
            } catch {
              window.location.replace('/');
            }
          }, 400);
        } else {
          setStatus('success');
          setTimeout(() => {
            window.location.replace('/');
          }, 500);
        }
      } catch (err) {
        console.error('Error handling auth callback:', err);
        setStatus('error');
        if (window.opener) {
          window.opener.postMessage({ type: 'SUPABASE_AUTH_ERROR' }, '*');
          setTimeout(() => {
            try {
              window.close();
            } catch {
              window.location.replace('/');
            }
          }, 1000);
        } else {
          setTimeout(() => {
            window.location.replace('/');
          }, 1500);
        }
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-saathi-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-hero text-center max-w-sm w-full border border-saathi-100">
        {status === 'processing' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-saathi-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-saathi-900 mb-2">Connecting Account</h2>
            <p className="text-sm text-saathi-600">Completing sign-in with Google. Please wait...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-saathi-900 mb-2">Authenticated!</h2>
            <p className="text-sm text-saathi-600">You are signed in. Redirecting to Saathi...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-saathi-900 mb-2">Returning to Saathi</h2>
            <p className="text-sm text-saathi-600">Redirecting to home screen...</p>
          </>
        )}
      </div>
    </div>
  );
}
