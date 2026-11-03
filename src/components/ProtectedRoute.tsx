
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession } from '../services/auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [status, setStatus] = useState<
    'checking' | 'authenticated' | 'unauthenticated'
  >('checking');

  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const token = sessionStorage.getItem('core_token');

      if (!token) {
        if (active) setStatus('unauthenticated');
        return;
      }

      try {
        const session = await getSession(token);

        sessionStorage.setItem(
            'core_user',
            JSON.stringify(session.user)
        );

        if (active) {
          setStatus('authenticated');
        }
      } catch {
        sessionStorage.removeItem('core_token');
        sessionStorage.removeItem('core_user');

        if (active) {
          setStatus('unauthenticated');
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

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
