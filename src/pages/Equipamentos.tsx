
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Monitor, Calendar, CheckCircle2, AlertTriangle, ShieldCheck,
  Plus, X, RefreshCw, Search, UserRound, Building2,
  Clock, Package
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type StatusEquipamento = 'pendente' | 'liberado' | 'nao_aplicavel';

interface EquipmentRequest {
  id: string;
  agendamento_id: string;
  equipamento_id: string;
  equipamento_nome: string;
  status: StatusEquipamento;
  higienizado_e_disponivel: boolean;
  atualizado_em: string | null;
  codigo_solicitacao: string | null;
  data_agendamento: string | null;
  hora_inicio_planejada: string | null;
  paciente_nome: string;
  medico_nome: string;
  medico_crm: string | null;
  hospital_nome: string;
  hospital_unidade: string | null;
  procedimento_nome: string;
}

interface AvailableEquipment {
  id: string;
  nome_equipamento: string;
  hospital_id: string;
}

interface ApiResponse<T> {
  status: string;
  items?: T;
  message?: string;
}

interface SurgeryGroup {
  agendamento_id: string;
  codigo_solicitacao: string | null;
  data_agendamento: string | null;
  hora_inicio_planejada: string | null;
  paciente_nome: string;
  medico_nome: string;
  medico_crm: string | null;
  hospital_nome: string;
  hospital_unidade: string | null;
  procedimento_nome: string;
  items: EquipmentRequest[];
}

function getToken() {
  return sessionStorage.getItem('core_token');
}

function formatDate(date: string | null) {
  if (!date) return 'Data não definida';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : 'Horário não definido';
}

function statusLabel(status: StatusEquipamento) {
  if (status === 'liberado') return 'Liberado';
  if (status === 'nao_aplicavel') return 'Não aplicável';
  return 'Pendente';
}

function StatusBadge({ status }: { status: StatusEquipamento }) {
  const styles: Record<StatusEquipamento, string> = {
    liberado: 'bg-emerald-100 text-emerald-700',
    pendente: 'bg-amber-100 text-amber-700',
    nao_aplicavel: 'bg-slate-100 text-slate-600'
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

export function Equipamentos() {
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modalError, setModalError] = useState('');

  const [targetRequest, setTargetRequest] = useState<EquipmentRequest | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<SurgeryGroup | null>(null);
  const [availableEquipment, setAvailableEquipment] = useState<AvailableEquipment[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const apiRequest = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error('Sua sessão expirou. Faça login novamente.');
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    let data: ApiResponse<unknown>;

    try {
      data = await response.json();
    } catch {
      throw new Error('O servidor retornou uma resposta inválida.');
    }

    if (!response.ok || data.status === 'error') {
      throw new Error(data.message || 'Não foi possível concluir a operação.');
    }

    return data;
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const data = await apiRequest('/equipamentos');
      setRequests((data.items as EquipmentRequest[]) ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Erro ao carregar equipamentos.'
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const groups = useMemo<SurgeryGroup[]>(() => {
    const grouped = new Map<string, SurgeryGroup>();

    for (const item of requests) {
      let group = grouped.get(item.agendamento_id);

      if (!group) {
        group = {
          agendamento_id: item.agendamento_id,
          codigo_solicitacao: item.codigo_solicitacao,
          data_agendamento: item.data_agendamento,
          hora_inicio_planejada: item.hora_inicio_planejada,
          paciente_nome: item.paciente_nome,
          medico_nome: item.medico_nome,
          medico_crm: item.medico_crm,
          hospital_nome: item.hospital_nome,
          hospital_unidade: item.hospital_unidade,
          procedimento_nome: item.procedimento_nome,
          items: []
        };

        grouped.set(item.agendamento_id, group);
      }

      group.items.push(item);
    }

    return Array.from(grouped.values());
  }, [requests]);

  const filteredGroups = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return groups;

    return groups.filter(group =>
      group.paciente_nome.toLowerCase().includes(search) ||
      group.procedimento_nome.toLowerCase().includes(search) ||
      (group.codigo_solicitacao ?? '').toLowerCase().includes(search) ||
      group.hospital_nome.toLowerCase().includes(search)
    );
  }, [groups, searchTerm]);

  async function handleValidation() {
    if (!targetRequest || validationLoading) return;

    setValidationLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await apiRequest(`/equipamentos/${targetRequest.id}/validar`, {
        method: 'PATCH',
        body: JSON.stringify({
          higienizado_e_disponivel: !targetRequest.higienizado_e_disponivel
        })
      });

      setSuccessMessage('Disponibilidade do equipamento atualizada.');
      setTargetRequest(null);
      await loadRequests();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Erro ao atualizar equipamento.'
      );
    } finally {
      setValidationLoading(false);
    }
  }

  async function openAddModal(group: SurgeryGroup) {
    setSelectedSurgery(group);
    setSelectedEquipmentIds([]);
    setAvailableEquipment([]);
    setModalError('');
    setShowAddModal(true);
    setEquipmentLoading(true);

    try {
      const data = await apiRequest(
        `/equipamentos/disponiveis/${group.agendamento_id}`
      );

      setAvailableEquipment((data.items as AvailableEquipment[]) ?? []);
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os equipamentos disponíveis.'
      );
    } finally {
      setEquipmentLoading(false);
    }
  }

  function closeAddModal() {
    if (addingEquipment) return;

    setShowAddModal(false);
    setSelectedSurgery(null);
    setSelectedEquipmentIds([]);
    setAvailableEquipment([]);
    setModalError('');
  }

  function toggleEquipment(id: string) {
    setSelectedEquipmentIds(previous =>
      previous.includes(id)
        ? previous.filter(item => item !== id)
        : [...previous, id]
    );
  }

  async function handleAddEquipment() {
    if (!selectedSurgery || selectedEquipmentIds.length === 0 || addingEquipment) {
      return;
    }

    setAddingEquipment(true);
    setModalError('');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await apiRequest('/equipamentos', {
        method: 'POST',
        body: JSON.stringify({
          agendamento_id: selectedSurgery.agendamento_id,
          equipamento_ids: selectedEquipmentIds
        })
      });

      closeAddModal();
      setSuccessMessage('Equipamentos vinculados à cirurgia com sucesso.');
      await loadRequests();
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : 'Não foi possível vincular os equipamentos.'
      );
    } finally {
      setAddingEquipment(false);
    }
  }

  const pendingCount = requests.filter(item => item.status === 'pendente').length;
  const releasedCount = requests.filter(item => item.status === 'liberado').length;

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800">
            <Monitor className="h-8 w-8 text-brand" />
            Centro Cirúrgico
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Equipamentos e validação de disponibilidade das cirurgias.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Calendar className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold text-slate-700">
            {new Date().toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-800">
        <ShieldCheck className="h-6 w-6 shrink-0 text-brand" />
        <p className="text-sm font-medium">
          Revise os equipamentos solicitados para cada cirurgia e confirme
          individualmente a higienização e disponibilidade antes do procedimento.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Cirurgias com equipamentos</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{groups.length}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Equipamentos pendentes</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Equipamentos liberados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{releasedCount}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Buscar por paciente, cirurgia, hospital ou código..."
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 focus:border-brand focus:outline-none"
          />
        </div>

        <button
          onClick={loadRequests}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {errorMessage && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Carregando equipamentos...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Monitor className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h3 className="font-semibold text-slate-700">
            {groups.length === 0
              ? 'Nenhuma solicitação de equipamento cadastrada'
              : 'Nenhuma cirurgia encontrada'}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {groups.length === 0
              ? 'As solicitações aparecerão aqui depois que equipamentos forem vinculados às cirurgias.'
              : 'Tente pesquisar por outro termo.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map(group => {
            const hasPending = group.items.some(item => item.status === 'pendente');
            const allReleased = group.items.every(item => item.status === 'liberado');

            return (
              <div
                key={group.agendamento_id}
                className="grid grid-cols-1 items-start gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-12"
              >
                <div className="space-y-2 border-b border-slate-100 pb-4 lg:col-span-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                  <div className="text-xs font-semibold text-slate-500">
                    {group.hospital_nome}
                  </div>
                  {group.hospital_unidade && (
                    <div className="text-xs text-slate-500">
                      {group.hospital_unidade}
                    </div>
                  )}
                  <div className="text-sm font-bold text-slate-800">
                    Solicitação {group.codigo_solicitacao ?? 'Não informada'}
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <Calendar className="h-3 w-3" />
                    {formatDate(group.data_agendamento)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="h-3 w-3" />
                    {formatTime(group.hora_inicio_planejada)}
                  </div>
                </div>

                <div className="space-y-2 border-b border-slate-100 pb-4 lg:col-span-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                  <div className="text-sm font-bold text-slate-800">
                    {group.procedimento_nome}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <UserRound className="h-3.5 w-3.5" />
                    {group.medico_nome}
                  </div>
                  {group.medico_crm && (
                    <p className="text-xs text-slate-500">CRM: {group.medico_crm}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Building2 className="h-3.5 w-3.5" />
                    {group.paciente_nome}
                  </div>
                </div>

                <div className="space-y-3 lg:col-span-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-brand" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Equipamentos solicitados
                    </span>
                  </div>

                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {item.equipamento_nome}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.higienizado_e_disponivel
                            ? 'Higienizado e disponível'
                            : 'Aguardando confirmação'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        <button
                          onClick={() => setTargetRequest(item)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {item.higienizado_e_disponivel ? 'Reverter' : 'Validar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 lg:col-span-2">
                  {allReleased ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                      <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
                      <p className="text-xs font-bold text-emerald-700">Tudo liberado</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                      <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-amber-600" />
                      <p className="text-xs font-bold text-amber-700">
                        {hasPending ? 'Há pendências' : 'Verificar recursos'}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => openAddModal(group)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar equipamento
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {targetRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-brand">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <h3 className="mb-2 text-center text-lg font-bold text-slate-800">
              {targetRequest.higienizado_e_disponivel
                ? 'Reverter validação'
                : 'Confirmar disponibilidade'}
            </h3>

            <p className="mb-6 text-center text-sm text-slate-600">
              Equipamento: <strong>{targetRequest.equipamento_nome}</strong>.
              {targetRequest.higienizado_e_disponivel
                ? ' Deseja retirar a confirmação de higienização e disponibilidade?'
                : ' Confirme somente se o equipamento estiver realmente livre e higienizado para a cirurgia.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setTargetRequest(null)}
                disabled={validationLoading}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleValidation}
                disabled={validationLoading}
                className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
              >
                {validationLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && selectedSurgery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Adicionar equipamentos
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedSurgery.procedimento_nome} — Solicitação{' '}
                  {selectedSurgery.codigo_solicitacao}
                </p>
              </div>
              <button
                onClick={closeAddModal}
                disabled={addingEquipment}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {modalError}
              </div>
            )}

            {equipmentLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Buscando equipamentos do hospital...
              </div>
            ) : availableEquipment.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-6 text-center">
                <Monitor className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhum equipamento disponível para vinculação
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Verifique o cadastro de equipamentos ativos deste hospital.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="mb-3 text-xs text-slate-500">
                  Selecione os equipamentos que serão vinculados à cirurgia.
                </p>

                {availableEquipment.map(equipment => {
                  const selected = selectedEquipmentIds.includes(equipment.id);

                  return (
                    <label
                      key={equipment.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selected
                          ? 'border-brand bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleEquipment(equipment.id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <Monitor className="h-5 w-5 text-slate-500" />
                      <span className="text-sm font-medium text-slate-800">
                        {equipment.nome_equipamento}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeAddModal}
                disabled={addingEquipment}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddEquipment}
                disabled={
                  addingEquipment ||
                  equipmentLoading ||
                  selectedEquipmentIds.length === 0
                }
                className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingEquipment && <RefreshCw className="h-4 w-4 animate-spin" />}
                Vincular selecionados ({selectedEquipmentIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
