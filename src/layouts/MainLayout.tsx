import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Package, Monitor, LogOut } from 'lucide-react';

export function MainLayout() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setShowLogoutModal(false);
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-800 text-white flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-700">
            <h1 className="text-2xl font-bold">Nexus CORE</h1>
            <p className="text-sm text-slate-400">Sistema de Regulação Cirúrgica</p>
          </div>
          
          <nav className="p-4 space-y-2">
            <Link to="/dashboard" className="flex items-center p-3 rounded-lg hover:bg-slate-700 transition-colors">
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
            <Link to="/busca" className="flex items-center p-3 rounded-lg hover:bg-slate-700 transition-colors">
              <FileText className="w-5 h-5 mr-3" />
              Nova Solicitação
            </Link>
            <Link to="/opme" className="flex items-center p-3 rounded-lg hover:bg-slate-700 transition-colors">
              <Package className="w-5 h-5 mr-3" />
              OPME
            </Link>
            <Link to="/cc" className="flex items-center p-3 rounded-lg hover:bg-slate-700 transition-colors">
              <Monitor className="w-5 h-5 mr-3" />
              Equipamentos
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex w-full items-center p-3 rounded-lg text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet /> 
      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Encerrar Sessão</h3>
            <p className="text-sm text-slate-600 mb-6">
              Tem certeza de que deseja sair do sistema? Você precisará fazer o login novamente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
              >
                Sim, Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}