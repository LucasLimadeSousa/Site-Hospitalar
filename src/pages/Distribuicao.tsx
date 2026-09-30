import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Building2, Sliders, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export function Distribuicao() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // resgata os dados da cirurgia vindos da busca
  const surgery = location.state?.surgery || {
    code: 'CIR-002',
    patientName: 'João Santos',
    porteLabel: 'Porte Grande (180 min)',
    durationMinutes: 180,
    supplier: 'Ortopedia Central'
  };

  const [hospital, setHospital] = useState('Hospital Unimed Sul');
  const [occupancyGoal, setOccupancyGoal] = useState(80);
  const [date, setDate] = useState('2026-10-02');
  
  const [calculatedRooms, setCalculatedRooms] = useState<any[] | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const handleValidateAndDistribute = (e: React.FormEvent) => {
    e.preventDefault();

    // cálculo P90 + 20 min fixos de turnover 
    const turnoverMinutes = 20;
    const totalTimeNeeded = surgery.durationMinutes + turnoverMinutes;

    if (occupancyGoal < 75 && totalTimeNeeded > 120) {
      setShowConflictModal(true);
      setCalculatedRooms(null);
      return;
    }

    setCalculatedRooms([
      {
        roomName: 'Sala 01 - Centro Cirúrgico Bloco A',
        capacity: '4 pacientes',
        timeSlot: `08:00 - ${Math.floor(8 + totalTimeNeeded / 60)}:${(totalTimeNeeded % 60).toString().padStart(2, '0')}`,
        occupancyRate: occupancyGoal
      }
    ]);
  };

    const handleConfirmBooking = () => {
    alert(`Pré-agendamento confirmado com sucesso para ${surgery.patientName}! A solicitação foi transferida para a aba "Agendadas" no painel principal.`);
    navigate('/dashboard');
    };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Building2 className="h-8 w-8 text-brand" />
          Validação e Distribuição de Salas Cirúrgicas
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configure os filtros abaixo para validar e distribuir as salas de acordo com a ocupação e disponibilidade.</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
        <form onSubmit={handleValidateAndDistribute} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Selecione o Hospital</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <select
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-brand focus:outline-none bg-white"
              >
                <option>Hospital Unimed Sul</option>
                <option>Hospital Unimed - HU</option>
                <option>Hospital Santa Helena</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Meta de Ocupação: {occupancyGoal}%</label>
            <div className="relative pt-2">
              <input
                type="range"
                min="50"
                max="95"
                value={occupancyGoal}
                onChange={(e) => setOccupancyGoal(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Selecione a Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-brand focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand py-3 font-semibold text-white shadow-md flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="h-5 w-5" />
              Validar e Distribuir
            </button>
          </div>

        </form>
      </div>

      {calculatedRooms && (
        <div className="space-y-4 animate-fadeIn">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-brand" />
            Salas Recomendadas (Cálculo P90 + 20 min turnover)
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {calculatedRooms.map((room, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-emerald-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Encaixe Perfeito</span>
                  <h4 className="text-lg font-bold text-slate-800">{room.roomName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Capacidade: {room.capacity} | Horário Sugerido: {room.timeSlot}</p>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Taxa Estimada</span>
                    <span className="text-sm font-bold text-slate-700">{room.occupancyRate}% Ocupação</span>
                  </div>

                  <button
                    onClick={handleConfirmBooking}
                    className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm flex items-center gap-2"
                  >
                    Confirmar Pré-agendamento <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-red-100 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Conflito de Horário ou Ocupação Excedida</h3>
            <p className="text-sm text-slate-600 mb-6">
              O tempo da cirurgia somado ao turnover excede os limites para os parâmetros informados. Escolha outra data ou horário.
            </p>
            <button
              onClick={() => setShowConflictModal(false)}
              className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 shadow-sm transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}