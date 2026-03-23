import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { clearAuthStorage, handleOAuthCallback } from '../services/oauth';

const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const oauthError = urlParams.get('error');

      if (oauthError) {
        setError(`Erreur OAuth: ${oauthError}`);
        return;
      }

      if (!code) {
        setError('Code OAuth manquant.');
        return;
      }

      try {
        await handleOAuthCallback(code, state);
        if (!cancelled) navigate('/dashboard', { replace: true });
      } catch (err) {
        clearAuthStorage();
        setError(err instanceof Error ? err.message : 'Erreur OAuth callback');
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Connexion OAuth échouée</h1>
            <p className="text-red-700 mt-3">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 px-5 py-2.5 rounded-xl bg-[#1fa3b3] text-white font-semibold hover:bg-[#157a99]"
            >
              Retour connexion
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Loader2 size={22} className="animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-4">Connexion en cours</h1>
            <p className="text-slate-600 mt-2">Validation de ton authentification OAuth...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
