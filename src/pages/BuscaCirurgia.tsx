import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, AlertCircle, Package, Monitor, Paintbrush, Truck, Lock } from 'lucide-react';

interface SurgeryResult {
  code: string;
  patientName: string;
  porte: 'P' | 'M' | 'G';
  porteLabel: string;
  durationMinutes: number;
  opmeStatus: 'Liberado' | 'Pendente' | 'Não Aplicável';
  equipmentStatus: 'Liberado' | 'Pendente' | 'Não Aplicável';
  supplier: string;
}

export function BuscaCirurgia() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [surgeryData, setSurgeryData] = useState<SurgeryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const mockDatabase: Record<string, SurgeryResult> = {
    'CIR-001': {
      code: 'CIR-001',
      patientName: 'Maria Silva',
      porte: 'M',
      porteLabel: 'Porte Médio (90 min)',
      durationMinutes: 90,
      opmeStatus: 'Pendente',
      equipmentStatus: 'Liberado',
      supplier: 'BioMed Brasil',
    },
    'CIR-002': {
      code: 'CIR-002',
      patientName: 'João Santos',
      porte: 'G',
      porteLabel: 'Porte Grande (180 min)',
      durationMinutes: 180,
      opmeStatus: 'Liberado',
      equipmentStatus: 'Liberado',
      supplier: 'Ortopedia Central',
    },
    'CIR-003': {
      code: 'CIR-003',
      patientName: 'Ana Oliveira',
      porte: 'P',
      porteLabel: 'Porte Pequeno (30 min)',
      durationMinutes: 30,
      opmeStatus: 'Não Aplicável',
      equipmentStatus: 'Liberado',
      supplier: 'N/A',
    },
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSurgeryData(null);

    const cleanCode = searchTerm.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMessage('Digite um código válido para buscar.');
      return;
    }

    const found = mockDatabase[cleanCode];

    if (found) {
      setSurgeryData(found);
    } else {
      setErrorMessage('Código inválido ou não encontrado');
    }
  };

  const getStatusBadge = (status: 'Liberado' | 'Pendente' | 'Não Aplicável') => {
    switch (status) {
      case 'Liberado':
        return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Liberado</span>;
      case 'Pendente':
        return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Pendente de OPME</span>;
      case 'Não Aplicável':
        return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">N/A</span>;
    }
  };

  // verifica se há alguma pendência bloqueadora
  const hasPendingItems = surgeryData 
    ? surgeryData.opmeStatus === 'Pendente' || surgeryData.equipmentStatus === 'Pendente'
    : false;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Search className="h-8 w-8 text-brand" />
            Busca de Cirurgia
          </h1>
          <p className="text-sm text-slate-500 mt-1">Consulte o código da solicitação autorizada para iniciar o agendamento</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4 items-start">
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o código da cirurgia (ex: CIR-001, CIR-002, CIR-003)"
                className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-4 text-slate-800 focus:border-brand focus:outline-none text-base shadow-sm"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1 font-medium">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 shadow-md flex items-center gap-2"
          >
            <Search className="h-5 w-5" />
            Buscar
          </button>
        </form>
      </div>

      {surgeryData && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand">Solicitação Localizada</span>
                <h2 className="text-xl font-bold text-slate-800">{surgeryData.patientName} <span className="text-sm font-normal text-slate-500">({surgeryData.code})</span></h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasPendingItems ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                {hasPendingItems ? 'Aguardando Insumos' : 'Pronta para Validação'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-emerald-100 rounded-lg text-brand">
                    <Paintbrush className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Porte de cirurgia</span>
                    <h3 className="text-lg font-bold text-slate-800">{surgeryData.porteLabel}</h3>
                  </div>
                </div>
                <p className="text-xs text-slate-500 pt-3 border-t border-slate-200">
                  Define o tempo padrão de ocupação da sala cirúrgica.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Fornecedor OPME</span>
                    <h3 className="text-lg font-bold text-slate-800">{surgeryData.supplier}</h3>
                  </div>
                </div>
                <p className="text-xs text-slate-500 pt-3 border-t border-slate-200">
                  Empresa responsável pela entrega dos materiais especiais.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-500 block font-medium mb-3">Status de Insumos</span>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 flex items-center gap-1.5"><Package className="h-4 w-4" /> OPME:</span>
                      {getStatusBadge(surgeryData.opmeStatus)}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 flex items-center gap-1.5"><Monitor className="h-4 w-4" /> Equipamentos:</span>
                      {getStatusBadge(surgeryData.equipmentStatus)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/distribuicao', { state: { surgery: surgeryData } })}
                  disabled={hasPendingItems}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition-colors ${
                    hasPendingItems 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                      : 'bg-brand hover:bg-emerald-700'
                  }`}
                >
                  {hasPendingItems ? <Lock className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  {hasPendingItems ? 'Aguardando Liberação de Insumos' : 'Prosseguir para Distribuição'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}