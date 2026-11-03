
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  UserRound,
  Stethoscope,
  Building2,
  Timer
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type StatusInsumo = 'liberado' | 'pendente' | 'nao_aplicavel';

type StatusKanban =
  | 'aguardando_liberacao'
  | 'pronta_para_agendamento'
  | 'agendada'
  | 'agendamento_realizado'
  | 'cancelada';

interface SurgeryResponse {
  id: string;
  codigo_solicitacao: string;
  paciente_nome: string | null;
  hospital_nome: string | null;
  medico_nome: string | null;
  procedimento_nome: string | null;
  procedimento_codigo: string | null;
  porte: string | null;
  tempo_medio_minutos: number | null;
  tempo_p75_minutos: number | null;
  tempo_p90_minutos: number | null;
  status_opme: StatusInsumo;
  status_equipamento: StatusInsumo;
  status_kanban: StatusKanban;
  data_agendamento: string | null;
  hora_inicio_planejada: string | null;
  cliente_confirmado_24h: boolean;
}

interface SurgeryCard {
  id: string;
  code: string;
  patientName: string;
  hospital: string;
  doctorName: string | null;
  procedureName: string | null;
  procedureCode: string | null;
  surgicalSize: string | null;
  averageDuration: number | null;
  p75Duration: number | null;
  p90Duration: number | null;
  opmeStatus: StatusInsumo;
  equipmentStatus: StatusInsumo;
  column: 'aguardando' | 'prontas' | 'agendadas';
  scheduledDate: string | null;
  scheduledTime: string | null;
  isConfirmedByClient: boolean;
}

interface DashboardResponse {
  status: string;
  agendamentos: SurgeryResponse[];
}

type DashboardStatus = 'loading' | 'success' | 'error';

function getUserFirstName(): string {
  try {
    const userData = sessionStorage.getItem('core_user');

    if (!userData) return 'usuário';

    const user = JSON.parse(userData);
    return user?.nome?.trim().split(/\s+/)[0] || 'usuário';
  } catch {
    return 'usuário';
  }
}

function mapKanbanStatus(
  status: StatusKanban
): SurgeryCard['column'] | null {
  switch (status) {
    case 'aguardando_liberacao':
      return 'aguardando';

    case 'pronta_para_agendamento':
      return 'prontas';

    case 'agendada':
      return 'agendadas';

    case 'agendamento_realizado':
    case 'cancelada':
      return null;

    default:
      return null;
  }
}

function formatDate(date: string | null): string {
  if (!date) return 'Não informada';

  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) return 'Data inválida';

  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return 'Não informado';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}min`;
}

function getStatusBadge(status: StatusInsumo) {
  switch (status) {
    case 'liberado':
      return (
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          Liberado
        </span>
      );

    case 'pendente':
      return (
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          Pendente
        </span>
      );

    case 'nao_aplicavel':
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          N/A
        </span>
      );

    default:
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
          Não informado
        </span>
      );
  }
}

function SurgeryDetails({ card }: { card: SurgeryCard }) {
  return (
    <div className="mb-3 space-y-3 border-t border-slate-100 pt-3">
      <div className="space-y-2 text-xs text-slate-600">
        <div className="flex items-start gap-2">
          <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <p className="font-medium text-slate-700">
              {card.procedureName || 'Procedimento não informado'}
            </p>
            <p className="mt-0.5 text-slate-400">
              Código: {card.procedureCode || 'Não informado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
          <span>
            Médico: {card.doctorName || 'Não informado'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
          <span>
            Porte: {card.surgicalSize || 'Não informado'}
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Timer className="h-4 w-4 text-slate-400" />
          Estimativa de duração
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-slate-400">Média</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-700">
              {formatDuration(card.averageDuration)}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400">P75</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-700">
              {formatDuration(card.p75Duration)}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400">P90</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-700">
              {formatDuration(card.p90Duration)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [cards, setCards] = useState<SurgeryCard[]>([]);
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const [distributionNotice, setDistributionNotice] = useState(
    () => location.state?.distributionSuccess
      ? 'Agendamento confirmado com sucesso! A cirurgia foi transferida para a coluna Agendadas.'
      : ''
  );

  const firstName = getUserFirstName();

  async function loadDashboard() {
    const token = sessionStorage.getItem('core_token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Sua sessão não foi encontrada. Faça login novamente.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/dashboard`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Não foi possível carregar o Dashboard.'
        );
      }

      const result = data as DashboardResponse;

      const mappedCards: SurgeryCard[] = result.agendamentos
        .map((surgery) => {
          const column = mapKanbanStatus(surgery.status_kanban);

          if (!column) return null;

          return {
            id: surgery.id,
            code: surgery.codigo_solicitacao,
            patientName: surgery.paciente_nome || 'Paciente não informado',
            hospital: surgery.hospital_nome || 'Hospital não informado',
            doctorName: surgery.medico_nome,
            procedureName: surgery.procedimento_nome,
            procedureCode: surgery.procedimento_codigo,
            surgicalSize: surgery.porte,
            averageDuration: surgery.tempo_medio_minutos,
            p75Duration: surgery.tempo_p75_minutos,
            p90Duration: surgery.tempo_p90_minutos,
            opmeStatus: surgery.status_opme,
            equipmentStatus: surgery.status_equipamento,
            column,
            scheduledDate: surgery.data_agendamento,
            scheduledTime: surgery.hora_inicio_planejada,
            isConfirmedByClient: surgery.cliente_confirmado_24h
          };
        })
        .filter((card): card is SurgeryCard => card !== null);

      setCards(mappedCards);
      setStatus('success');
    } catch (error) {
      setStatus('error');

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro inesperado ao carregar os dados.'
      );
    }
  }

  useEffect(() => {
    loadDashboard();

    // Consome o aviso de sucesso para ele não reaparecer
    // caso o usuário atualize a página.
    if (location.state?.distributionSuccess) {
      navigate(location.pathname, {
        replace: true,
        state: null
      });
    }
  }, []);

  const waitingCards = cards.filter(
    card => card.column === 'aguardando'
  );

  const readyCards = cards.filter(
    card => card.column === 'prontas'
  );

  const scheduledCards = cards.filter(
    card => card.column === 'agendadas'
  );

  function handleStartScheduling(card: SurgeryCard) {
    navigate('/distribuicao', {
      state: {
        surgery: {
          id: card.id,
          code: card.code,
          patientName: card.patientName,
          hospital: card.hospital,
          scheduledDate: card.scheduledDate,
          scheduledTime: card.scheduledTime
        }
      }
    });
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Olá, {firstName}!
          </h1>

          <p className="text-sm text-slate-500">
            Acompanhamento do fluxo cirúrgico
          </p>
        </div>

        <button
          onClick={loadDashboard}
          disabled={status === 'loading'}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              status === 'loading' ? 'animate-spin' : ''
            }`}
          />
          Atualizar
        </button>
      </div>

      {distributionNotice && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Distribuição concluída</p>
            <p className="mt-1">{distributionNotice}</p>
          </div>
          <button
            onClick={() => setDistributionNotice('')}
            className="ml-auto text-emerald-700 hover:text-emerald-900"
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <div className="text-center">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">
              Carregando agendamentos...
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-500" />

          <p className="font-semibold text-red-700">
            Não foi possível carregar o Dashboard
          </p>

          <p className="mt-1 text-sm text-red-600">
            {errorMessage}
          </p>

          <button
            onClick={loadDashboard}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {status === 'success' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Aguardando liberação */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-100 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-slate-700">
                <Clock className="h-4 w-4 text-amber-600" />
                Aguardando Liberação
              </h2>

              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                {waitingCards.length}
              </span>
            </div>

            <div className="flex-1 space-y-3">
              {waitingCards.map(card => (
                <div
                  key={card.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      {card.code}
                    </span>

                    <span className="text-xs text-amber-600">
                      Aguardando liberação
                    </span>
                  </div>

                  <p className="mb-2 text-sm font-medium text-slate-700">
                    {card.patientName}
                  </p>

                  <p className="mb-3 text-xs text-slate-500">
                    {card.hospital}
                  </p>

                  <SurgeryDetails card={card} />

                  <div className="mb-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>OPME:</span>
                      {getStatusBadge(card.opmeStatus)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Equipamentos:</span>
                      {getStatusBadge(card.equipmentStatus)}
                    </div>
                  </div>

                  <div className="flex items-center justify-center rounded-lg bg-amber-50 py-2 text-xs font-semibold text-amber-700">
                    Aguardando insumos
                  </div>
                </div>
              ))}

              {waitingCards.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">
                  Nenhuma cirurgia aguardando liberação.
                </p>
              )}
            </div>
          </div>

          {/* Prontas para agendamento */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-100 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Prontas para Agendamento
              </h2>

              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                {readyCards.length}
              </span>
            </div>

            <div className="flex-1 space-y-3">
              {readyCards.map(card => (
                <div
                  key={card.id}
                  className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      {card.code}
                    </span>

                    <span className="text-xs font-medium text-emerald-600">
                      Liberada
                    </span>
                  </div>

                  <p className="mb-2 text-sm font-medium text-slate-700">
                    {card.patientName}
                  </p>

                  <p className="mb-3 text-xs text-slate-500">
                    {card.hospital}
                  </p>

                  <SurgeryDetails card={card} />

                  <div className="mb-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>OPME:</span>
                      {getStatusBadge(card.opmeStatus)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Equipamentos:</span>
                      {getStatusBadge(card.equipmentStatus)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartScheduling(card)}
                    className="btn-primary flex w-full items-center justify-center gap-1 py-2 text-xs"
                  >
                    Iniciar Agendamento
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {readyCards.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">
                  Nenhuma cirurgia pronta para agendamento.
                </p>
              )}
            </div>
          </div>

          {/* Agendadas */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-100 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-slate-700">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                Agendadas (Bate Mapa)
              </h2>

              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                {scheduledCards.length}
              </span>
            </div>

            <div className="flex-1 space-y-3">
              {scheduledCards.map(card => (
                <div
                  key={card.id}
                  className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      {card.code}
                    </span>

                    <span className="text-xs font-medium text-blue-600">
                      Agendada
                    </span>
                  </div>

                  <p className="mb-2 text-sm font-medium text-slate-700">
                    {card.patientName}
                  </p>

                  <p className="mb-3 text-xs text-slate-500">
                    {card.hospital}
                  </p>

                  <SurgeryDetails card={card} />

                  <div className="mb-3 text-xs text-slate-500">
                    <p>
                      Data: {formatDate(card.scheduledDate)}
                    </p>

                    {card.scheduledTime && (
                      <p>
                        Horário: {card.scheduledTime.slice(0, 5)}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          card.isConfirmedByClient
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />

                      {card.isConfirmedByClient
                        ? 'Cliente confirmado (24h)'
                        : 'Aguardando confirmação do cliente'}
                    </div>
                  </div>
                </div>
              ))}

              {scheduledCards.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">
                  Nenhuma cirurgia agendada.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
