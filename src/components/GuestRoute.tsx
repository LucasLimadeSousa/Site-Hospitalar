
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession } from '../services/auth';

interface GuestRouteProps {
  children: ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const [status, setStatus] = useState<
    'checking' | 'guest' | 'authenticated'
  >('checking');

  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const token = sessionStorage.getItem('core_token');

      if (!token) {
        if (active) setStatus('guest');
        return;
      }

      try {
        await getSession(token);

        if (active) {
          setStatus('authenticated');
        }
      } catch {
        sessionStorage.removeItem('core_token');
        sessionStorage.removeItem('core_user');

        if (active) {
          setStatus('guest');
        }
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          Verificando sua sessão...
        </p>
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
