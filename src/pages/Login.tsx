
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, UserCheck, Activity } from 'lucide-react';
import { login } from '../services/auth';

export function Login() {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const data = await login(credential.trim(), password);

      sessionStorage.setItem('core_token', data.token);
      sessionStorage.setItem('core_user', JSON.stringify(data.user));

      navigate('/dashboard');

    } catch (error) {
      console.error('Erro ao realizar login:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível realizar o login.'
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col justify-between bg-slate-100 p-6">

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white shadow-sm">
          <Activity className="h-5 w-5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wide text-slate-800">CORE</span>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500 font-medium">
            Central de Operações e Relações Externas
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg border border-slate-200">

          <div className="text-center mb-8">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-white font-bold text-xl shadow-md">
              C
            </div>

            <h2 className="text-2xl font-bold text-slate-800">Nexus CORE</h2>
            <p className="text-sm text-slate-500">
              Portal de Agendamento Cirúrgico
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200 text-center"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label
                htmlFor="credential"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Credencial (Matrícula)
              </label>

              <div className="relative">
                <UserCheck className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                <input
                  id="credential"
                  type="text"
                  required
                  autoComplete="username"
                  disabled={loading}
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="Digite sua credencial"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-slate-800 focus:border-brand focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Senha
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-12 text-slate-800 focus:border-brand focus:outline-none disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword
                    ? <EyeOff className="h-5 w-5" />
                    : <Eye className="h-5 w-5" />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

          </form>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 space-y-1">
        <p>
          Este é um sistema restrito para uso médico-hospitalar autorizado.
          Em conformidade a LGPD, todos os acessos são monitorados e registrados.
        </p>

        <p className="text-[11px] text-slate-400">
          CORE v4.12.2 • Tecnologia Hospitalar e Gestão de Agendamentos • © 2026 Hospital S/A.
        </p>
      </div>

    </div>
  );
}
