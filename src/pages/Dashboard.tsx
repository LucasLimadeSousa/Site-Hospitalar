import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface SurgeryCard {
  id: string;
  code: string;
  patientName: string;
  hospital: string;
  opmeStatus: 'Liberado' | 'Pendente' | 'Não Aplicável';
  equipmentStatus: 'Liberado' | 'Pendente' | 'Não Aplicável';
  column: 'aguardando' | 'prontas' | 'agendadas';
  scheduledDate?: string;
  isConfirmedByClient?: boolean;
}

export function Dashboard() {
  const navigate = useNavigate();

  const [cards, setCards] = useState<SurgeryCard[]>([
    {
      id: '1',
      code: 'CIR-001',
      patientName: 'Maria Silva',
      hospital: 'Hospital Unimed Sul',
      opmeStatus: 'Pendente',
      equipmentStatus: 'Liberado',
      column: 'aguardando',
    },
    {
      id: '2',
      code: 'CIR-002',
      patientName: 'João Santos',
      hospital: 'Hospital Unimed - HU',
      opmeStatus: 'Liberado',
      equipmentStatus: 'Liberado',
      column: 'prontas',
    },
    {
      id: '3',
      code: 'CIR-003',
      patientName: 'Ana Oliveira',
      hospital: 'Hospital Unimed Sul',
      opmeStatus: 'Não Aplicável',
      equipmentStatus: 'Liberado',
      column: 'agendadas',
      scheduledDate: '02/10/2026 14:00',
      isConfirmedByClient: false,
    },
  ]);

  const getStatusBadge = (status: 'Liberado' | 'Pendente' | 'Não Aplicável') => {
    switch (status) {
      case 'Liberado':
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Liberado</span>;
      case 'Pendente':
        return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Pendente</span>;
      case 'Não Aplicável':
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">N/A</span>;
    }
  };

  const waitingCards = cards.filter(c => c.column === 'aguardando');
  const readyCards = cards.filter(c => c.column === 'prontas');
  const scheduledCards = cards.filter(c => c.column === 'agendadas');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard de Regulação</h1>
        <p className="text-sm text-slate-500">Acompanhamento do fluxo cirúrgico</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        <div className="flex flex-col rounded-xl bg-slate-100 p-4 border border-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Aguardando Liberação
            </h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
              {waitingCards.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {waitingCards.map(card => (
              <div key={card.id} className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800">{card.code}</span>
                  <span className="text-xs text-slate-400">Autorizado pela Auditoria</span>
                </div>
                <p className="text-sm font-medium text-slate-700 mb-3">{card.patientName}</p>
                
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span>OPME:</span>
                    {getStatusBadge(card.opmeStatus)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Equipamentos:</span>
                    {getStatusBadge(card.equipmentStatus)}
                  </div>
                </div>

                <button
                  disabled
                  className="w-full rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed flex items-center justify-center gap-1"
                >
                  Aguardando Insumos
                </button>
              </div>
            ))}
            {waitingCards.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">Nenhuma cirurgia aguardando.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl bg-slate-100 p-4 border border-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Prontas para Agendamento
            </h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              {readyCards.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {readyCards.map(card => (
              <div key={card.id} className="rounded-lg bg-white p-4 shadow-sm border border-emerald-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800">{card.code}</span>
                  <span className="text-xs text-emerald-600 font-medium">100% Liberado</span>
                </div>
                <p className="text-sm font-medium text-slate-700 mb-3">{card.patientName}</p>
                
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span>OPME:</span>
                    {getStatusBadge(card.opmeStatus)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Equipamentos:</span>
                    {getStatusBadge(card.equipmentStatus)}
                  </div>
                </div>

                <button
                    onClick={() => navigate('/distribuicao', { state: { surgery: { code: card.code, patientName: card.patientName, porteLabel: 'Porte Médio (90 min)', durationMinutes: 90, supplier: 'Fornecedor Padrão' } } })}
                    className="w-full rounded-lg bg-brand py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                    Iniciar Agendamento <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
            {readyCards.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">Nenhuma cirurgia pronta.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl bg-slate-100 p-4 border border-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Agendadas (Bate Mapa)
            </h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
              {scheduledCards.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {scheduledCards.map(card => (
              <div key={card.id} className="rounded-lg bg-white p-4 shadow-sm border border-blue-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800">{card.code}</span>
                  <span className="text-xs text-blue-600 font-medium">{card.hospital}</span>
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">{card.patientName}</p>
                <p className="text-xs text-slate-500 mb-3">Data: {card.scheduledDate}</p>

                <div className="border-t border-slate-100 pt-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={card.isConfirmedByClient} 
                        onChange={() => {
                            alert("Confirmação de atendimento registrada com sucesso! O processo foi concluído.");
                        }}
                        className="rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    Cliente Confirmado (24h)
                  </label>
                </div>
              </div>
            ))}
            {scheduledCards.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">Nenhuma cirurgia agendada.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}