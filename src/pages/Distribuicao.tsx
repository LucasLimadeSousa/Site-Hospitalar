
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Building2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
  MapPin
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SurgeryResponse {
  id: string;
  codigo_solicitacao: string;
  paciente?: { nome: string } | { nome: string }[] | null;
  pacientes?: { nome: string } | { nome: string }[] | null;
  tipos_cirurgia?: {
    nome_procedimento: string;
    codigo_cirurgia: string;
    porte: string;
    tempo_p75_minutos: number | null;
    tempo_p90_minutos: number | null;
  } | {
    nome_procedimento: string;
    codigo_cirurgia: string;
    porte: string;
    tempo_p75_minutos: number | null;
    tempo_p90_minutos: number | null;
  }[] | null;
  status_opme: string;
  status_equipamento: string;
  status_kanban: string;
}

interface Hospital {
  id: string;
  nome: string;
  unidade: string | null;
}

interface RoomOption {
  sala_id: string;
  sala_numero: string;
  bloco: string;
  andar: number;
  hora_inicio: string;
  hora_fim_cirurgia: string;
  hora_fim_com_turnover: string;
  duracao_p90_minutos: number;
  turnover_minutos: number;
  duracao_total_minutos: number;
  ocupacao_final_percentual: number;
}

interface ValidationResponse {
  status: string;
  message: string;
  cirurgia?: {
    id: string;
    codigo_solicitacao: string;
    p75_minutos: number | null;
    p90_minutos: number;
  };
  opcoes?: RoomOption[];
}

interface ApiError {
  message?: string;
}

interface SurgeryState {
  id?: string;
  code?: string;
  patientName?: string;
}

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (remaining === 0) return `${hours}h`;

  return `${hours}h ${remaining}min`;
}

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function Distribuicao() {
  const location = useLocation();
  const navigate = useNavigate();

  const surgeryState = location.state?.surgery as SurgeryState | undefined;

  const [surgery, setSurgery] = useState<SurgeryResponse | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalId, setHospitalId] = useState('');
  const [occupancyGoal, setOccupancyGoal] = useState(80);
  const [date, setDate] = useState('2026-11-16');

  const [calculatedRooms, setCalculatedRooms] = useState<RoomOption[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null);

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);

  const token = sessionStorage.getItem('core_token');

  async function apiRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    const data = await response.json() as T & ApiError;

    if (!response.ok) {
      throw new Error(data.message || 'Não foi possível concluir a operação.');
    }

    return data;
  }

  useEffect(() => {
    async function loadInitialData() {
      if (!token) {
        setErrorMessage('Sua sessão expirou. Faça login novamente.');
        setLoading(false);
        return;
      }

      if (!surgeryState?.code) {
        setErrorMessage('Nenhuma cirurgia foi selecionada. Volte ao Dashboard.');
        setLoading(false);
        return;
      }

      try {
        const [hospitalResponse, surgeryResponse] = await Promise.all([
          apiRequest<{ hospitais: Hospital[] }>('/distribuicao/hospitais'),
          apiRequest<{ cirurgia?: SurgeryResponse }>(
            `/cirurgias/${encodeURIComponent(surgeryState.code)}`
          )
        ]);

        const surgeryData = surgeryResponse.cirurgia;

        if (!surgeryData) {
          throw new Error('Não foi possível localizar os dados da cirurgia.');
        }

        setHospitals(hospitalResponse.hospitais || []);
        setSurgery(surgeryData);

        if (hospitalResponse.hospitais?.length) {
          setHospitalId(hospitalResponse.hospitais[0].id);
        }

        if (
          surgeryData.status_kanban === 'agendada' ||
          surgeryData.status_kanban === 'agendamento_realizado' ||
          surgeryData.status_kanban === 'cancelada'
        ) {
          throw new Error(
            'Esta cirurgia já foi agendada ou não está disponível para distribuição.'
          );
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Erro ao carregar os dados.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  function clearPreviousOptions() {
    setCalculatedRooms([]);
    setSelectedRoom(null);
    setErrorMessage('');
    setSuccessMessage('');
  }

  async function handleValidateAndDistribute(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!surgery) {
      setErrorMessage('Os dados da cirurgia não foram carregados.');
      return;
    }

    if (!hospitalId) {
      setErrorMessage('Selecione um hospital.');
      return;
    }

    if (!date) {
      setErrorMessage('Selecione uma data.');
      return;
    }

    setValidating(true);
    clearPreviousOptions();

    try {
      const result = await apiRequest<ValidationResponse>(
        '/distribuicao/validar',
        {
          method: 'POST',
          body: JSON.stringify({
            agendamento_id: surgery.id,
            hospital_id: hospitalId,
            data: date,
            ocupacao_maxima: occupancyGoal
          })
        }
      );

      setCalculatedRooms(result.opcoes || []);
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível validar a distribuição.'
      );

      setShowConflictModal(true);
    } finally {
      setValidating(false);
    }
  }

  async function handleConfirmBooking() {
    if (!surgery || !selectedRoom) {
      setErrorMessage('Selecione uma sala antes de confirmar.');
      return;
    }

    setConfirming(true);
    setErrorMessage('');

    try {
      const result = await apiRequest<{
        status: string;
        message: string;
      }>('/distribuicao/confirmar', {
        method: 'POST',
        body: JSON.stringify({
          agendamento_id: surgery.id,
          hospital_id: hospitalId,
          sala_id: selectedRoom.sala_id,
          data: date,
          hora_inicio_planejada: selectedRoom.hora_inicio,
          ocupacao_maxima: occupancyGoal
        })
      });

      setSuccessMessage(result.message);

      navigate('/dashboard', {
        replace: true,
        state: {
          distributionSuccess: true
        }
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar o agendamento.'
      );

      setShowConflictModal(true);
      setCalculatedRooms([]);
      setSelectedRoom(null);
    } finally {
      setConfirming(false);
    }
  }

  const procedure = firstRelation(surgery?.tipos_cirurgia);
  const patient = firstRelation(
    surgery?.paciente ?? surgery?.pacientes
  );

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-3 text-sm text-slate-500">
          Carregando dados da distribuição...
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800">
          <Building2 className="h-8 w-8 text-brand" />
          Validação e Distribuição de Salas Cirúrgicas
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Configure os filtros para validar e distribuir as salas de acordo com a ocupação e disponibilidade.
        </p>
      </div>

      {errorMessage && !showConflictModal && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {surgery && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Cirurgia selecionada
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-800">
                Solicitação {surgery.codigo_solicitacao}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Paciente: {patient?.nome || surgeryState?.patientName || 'Não informado'}
              </p>

              <p className="text-sm text-slate-600">
                Procedimento: {procedure?.nome_procedimento || 'Não informado'}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <p className="text-xs text-slate-500">P90</p>
              <p className="font-bold text-slate-800">
                {procedure?.tempo_p90_minutos != null
                  ? formatDuration(procedure.tempo_p90_minutos)
                  : 'Não informado'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          onSubmit={handleValidateAndDistribute}
          className="grid grid-cols-1 items-end gap-6 md:grid-cols-4"
        >
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Selecione o Hospital
            </label>

            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

              <select
                value={hospitalId}
                onChange={event => {
                  setHospitalId(event.target.value);
                  clearPreviousOptions();
                }}
                required
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-brand focus:outline-none"
              >
                <option value="">Selecione...</option>

                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.nome}
                    {hospital.unidade ? ` - ${hospital.unidade}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Meta de Ocupação: {occupancyGoal}%
            </label>

            <div className="pt-2">
              <input
                type="range"
                min="50"
                max="95"
                value={occupancyGoal}
                onChange={event => {
                  setOccupancyGoal(Number(event.target.value));
                  clearPreviousOptions();
                }}
                className="w-full cursor-pointer accent-brand"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Selecione a Data
            </label>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

              <input
                type="date"
                value={date}
                min={getToday()}
                onChange={event => {
                  setDate(event.target.value);
                  clearPreviousOptions();
                }}
                required
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={validating || !surgery || !hospitalId}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {validating ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}

              {validating ? 'Validando...' : 'Validar e Distribuir'}
            </button>
          </div>
        </form>
      </div>

      {successMessage && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {calculatedRooms.length > 0 && (
        <div className="animate-fadeIn space-y-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Sliders className="h-5 w-5 text-brand" />
              Salas Recomendadas (P90 + 20 min de turnover)
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Selecione uma das opções encontradas pelo algoritmo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {calculatedRooms.map(room => {
              const isSelected = selectedRoom?.sala_id === room.sala_id;

              return (
                <button
                  type="button"
                  key={`${room.sala_id}-${room.hora_inicio}`}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full rounded-xl border bg-white p-6 text-left shadow-sm transition ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-100'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                        {isSelected ? 'Opção selecionada' : 'Sala disponível'}
                      </span>

                      <h4 className="mt-1 text-lg font-bold text-slate-800">
                        {room.sala_numero}
                      </h4>

                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {room.bloco} — {room.andar}º andar
                      </p>

                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="h-4 w-4" />
                        Início: {room.hora_inicio.slice(0, 5)}
                        {' · '}
                        Fim P90: {room.hora_fim_cirurgia.slice(0, 5)}
                      </p>

                      <p className="text-xs text-slate-500">
                        Sala reservada até {room.hora_fim_com_turnover.slice(0, 5)}
                        {' · '}
                        {room.turnover_minutos} min de turnover
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 md:justify-end">
                      <div className="text-right">
                        <span className="block text-xs text-slate-500">
                          Ocupação estimada
                        </span>

                        <span className="text-sm font-bold text-slate-700">
                          {room.ocupacao_final_percentual}%
                        </span>
                      </div>

                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-4 w-4" />}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRoom && (
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 md:flex-row md:items-center">
              <div>
                <p className="font-semibold text-emerald-800">
                  {selectedRoom.sala_numero} selecionada
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  {selectedRoom.hora_inicio.slice(0, 5)}
                  {' até '}
                  {selectedRoom.hora_fim_com_turnover.slice(0, 5)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={confirming}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirming ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}

                {confirming ? 'Salvando...' : 'Confirmar Agendamento'}

                {!confirming && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      )}

      {calculatedRooms.length === 0 &&
        !validating &&
        !errorMessage &&
        successMessage && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Nenhuma sala disponível foi encontrada.
          </div>
        )}

      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-red-100 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h3 className="mb-1 text-lg font-bold text-slate-800">
              Não foi possível concluir
            </h3>

            <p className="mb-6 text-sm text-slate-600">
              {errorMessage}
            </p>

            <button
              onClick={() => setShowConflictModal(false)}
              className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
