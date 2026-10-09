import { useState } from 'react';
import { Monitor, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface EquipmentGroup {
  id: string;
  hospital: string;
  room: string;
  timeSlot: string;
  surgeryName: string;
  doctor: string;
  patient: string;
  items: { name: string; status: 'Disponível' | 'Pendente' }[];
}

export function Equipamentos() {
  const [groups, setGroups] = useState<EquipmentGroup[]>([
    {
      id: '1',
      hospital: 'VidaNova - Unidade Centro',
      room: 'Sala 01',
      timeSlot: '08:00 - 10:30',
      surgeryName: 'Colecistectomia Videolaparoscopia',
      doctor: 'Dr. Carlos Almeida (CRM 77889)',
      patient: 'Maria Eduarda Lima (Pront. 45231)',
      items: [
        { name: 'Video Laparoscópio', status: 'Pendente' },
        { name: 'Torre de Vídeo', status: 'Disponível' },
        { name: 'Pinça Ultrassônica', status: 'Disponível' },
        { name: 'Insuflador de CO2', status: 'Pendente' },
        { name: 'Monitor Multiparamétrico', status: 'Pendente' },
      ]
    },
    {
      id: '2',
      hospital: 'VidaNova - Unidade Centro',
      room: 'Sala 02',
      timeSlot: '11:00 - 13:00',
      surgeryName: 'Colecistectomia Videolaparoscopia',
      doctor: 'Dr. Carlos Almeida (CRM 77889)',
      patient: 'Ana Paula Souza (Pront. 99882)',
      items: [
        { name: 'Video Laparoscópio', status: 'Disponível' },
        { name: 'Torre de Vídeo', status: 'Disponível' },
        { name: 'Pinça Ultrassônica', status: 'Disponível' },
        { name: 'Insuflador de CO2', status: 'Disponível' },
        { name: 'Monitor Multiparamétrico', status: 'Disponível' },
      ]
    }
  ]);

  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);

  const confirmValidation = () => {
    if (targetGroupId) {
      setGroups(prev => prev.map(group => {
        if (group.id === targetGroupId) {
          return {
            ...group,
            items: group.items.map(item => ({ ...item, status: 'Disponível' }))
          };
        }
        return group;
      }));
      setTargetGroupId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Monitor className="h-8 w-8 text-brand" />
            Centro Cirúrgico
          </h1>
          <p className="text-sm text-slate-500 mt-1">Equipamentos - Pré-agendamentos do dia</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm">
          <Calendar className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold text-slate-700">26/09/2026</span>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-sky-50 p-4 border border-sky-200 flex items-center gap-3 text-sky-800">
        <ShieldCheck className="h-6 w-6 text-brand shrink-0" />
        <p className="text-sm font-medium">Revise os equipamentos solicitados para cada cirurgia e valide a higienização e disponibilidade antes do procedimento.</p>
      </div>

      <div className="space-y-6">
        {groups.map(group => {
          const hasPending = group.items.some(i => i.status === 'Pendente');

          return (
            <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              <div className="lg:col-span-3 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
                <div className="text-xs text-slate-500 font-semibold">{group.hospital}</div>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-brand"></span> {group.room}
                </div>
                <div className="text-xs text-slate-600 font-medium bg-slate-100 inline-block px-2.5 py-1 rounded-md">{group.timeSlot}</div>
              </div>

              <div className="lg:col-span-4 space-y-1 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
                <div className="text-sm font-bold text-slate-800">{group.surgeryName}</div>
                <div className="text-xs text-slate-600">{group.doctor}</div>
                <div className="text-xs text-slate-500 font-medium">{group.patient}</div>
              </div>

              <div className="lg:col-span-3 space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Equipamentos Solicitados</span>
                {group.items.map((eq, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-700">{eq.name}</span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${
                      eq.status === 'Disponível' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {eq.status === 'Disponível' ? 'Disponível' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-2 flex flex-col justify-center">
                {hasPending ? (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-red-50 p-2.5 text-center text-xs font-semibold text-red-700 border border-red-200 flex items-center justify-center gap-1">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> Há pendências
                    </div>
                    <button
                      onClick={() => setTargetGroupId(group.id)}
                      className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Validar Tudo
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg bg-emerald-50 p-3 text-center border border-emerald-200">
                    <div className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="h-4 w-4" /> Tudo Pronto
                    </div>
                    <span className="text-[10px] text-emerald-600 block">Equipamentos livres e higienizados</span>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {targetGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-brand">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmar Disponibilidade</h3>
            <p className="text-sm text-slate-600 mb-6">
              Tem certeza de que todos os equipamentos solicitados estarão livres e higienizados para esta cirurgia na data prevista?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTargetGroupId(null)}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmValidation}
                className="btn-primary flex-1 py-2.5 text-sm"
              >
                Sim, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}