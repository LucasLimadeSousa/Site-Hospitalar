
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  AlertCircle,
  Package,
  Monitor,
  Paintbrush,
  Truck,
  Lock,
  UserRound,
  Building2,
  RefreshCw,
  CalendarDays,
  ClipboardList,
  Eye
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type StatusRecurso = 'liberado' | 'pendente' | 'nao_aplicavel';

interface MaterialCatalogo {
  id: string;
  nome_material: string;
  categoria: string | null;
  obrigatorio: boolean;
}

interface SolicitacaoOpme {
  id: string;
  descricao_material: string | null;
  status: StatusRecurso;
  fornecedor_nome: string | null;
}

interface SolicitacaoEquipamento {
  id: string;
  nome_equipamento: string | null;
  status: StatusRecurso;
  higienizado_e_disponivel: boolean;
}

interface SurgeryResult {
  id: string;
  codigo_solicitacao: string;
  paciente_nome: string | null;
  medico_nome: string | null;
  medico_crm: string | null;
  hospital_nome: string | null;
  hospital_unidade: string | null;
  codigo_cirurgia: string | null;
  procedimento_nome: string | null;
  porte: string | null;
  tempo_medio_minutos: number | null;
  tempo_p75_minutos: number | null;
  tempo_p90_minutos: number | null;
  materiais_catalogo: MaterialCatalogo[];
  solicitacoes_opme: SolicitacaoOpme[];
  solicitacoes_equipamentos: SolicitacaoEquipamento[];
  status_opme: StatusRecurso;
  status_equipamento: StatusRecurso;
  status_kanban: string;
  data_agendamento: string | null;
  hora_inicio_planejada: string | null;
  cliente_confirmado_24h: boolean;
}

interface SurgeryListItem {
  id: string;
  codigo_solicitacao: string;
  paciente_nome: string | null;
  medico_nome: string | null;
  medico_crm: string | null;
  hospital_nome: string | null;
  hospital_unidade: string | null;
  codigo_cirurgia: string | null;
  procedimento_nome: string | null;
  porte: string | null;
  status_opme: StatusRecurso;
  status_equipamento: StatusRecurso;
  status_kanban: string;
  data_agendamento: string | null;
  hora_inicio_planejada: string | null;
  criado_em: string | null;
}

interface SearchResponse {
  status: string;
  cirurgia: SurgeryResult;
}

interface ListResponse {
  status: string;
  total: number;
  cirurgias: SurgeryListItem[];
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return 'Não informado';

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (remaining === 0) return `${hours}h`;

  return `${hours}h ${remaining}min`;
}

function formatDate(date: string | null): string {
  if (!date) return 'Data não definida';

  const [year, month, day] = date.split('-');

  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}

function formatResourceStatus(status: StatusRecurso): string {
  switch (status) {
    case 'liberado':
      return 'Liberado';
    case 'pendente':
      return 'Pendente';
    case 'nao_aplicavel':
      return 'Não aplicável';
    default:
      return 'Não informado';
  }
}

function formatKanbanStatus(status: string): string {
  const labels: Record<string, string> = {
    aguardando_liberacao: 'Aguardando liberação',
    pronta_para_agendamento: 'Pronta para agendamento',
    agendada: 'Agendada',
    agendamento_realizado: 'Agendamento realizado',
    cancelada: 'Cancelada'
  };

  return labels[status] || status;
}

function StatusBadge({ status }: { status: StatusRecurso }) {
  const styles = {
    liberado: 'bg-emerald-100 text-emerald-700',
    pendente: 'bg-red-100 text-red-700',
    nao_aplicavel: 'bg-slate-100 text-slate-600'
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || styles.pendente}`}>
      {formatResourceStatus(status)}
    </span>
  );
}

export function BuscaCirurgia() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [listFilter, setListFilter] = useState('');

  const [surgeryList, setSurgeryList] = useState<SurgeryListItem[]>([]);
  const [surgeryData, setSurgeryData] = useState<SurgeryResult | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [listError, setListError] = useState('');

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  async function loadSurgeryList() {
    const token = sessionStorage.getItem('core_token');

    if (!token) {
      setListError('Sua sessão expirou. Faça login novamente.');
      setListLoading(false);
      return;
    }

    setListLoading(true);
    setListError('');

    try {
      const response = await fetch(`${API_URL}/cirurgias`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível carregar as solicitações.');
      }

      const result = data as ListResponse;
      setSurgeryList(result.cirurgias || []);
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro ao carregar as solicitações.'
      );
    } finally {
      setListLoading(false);
    }
  }

  async function loadSurgeryDetails(code: string) {
    const cleanCode = code.trim();

    if (!cleanCode) return;

    const token = sessionStorage.getItem('core_token');

    if (!token) {
      setErrorMessage('Sua sessão expirou. Faça login novamente.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_URL}/cirurgias/${encodeURIComponent(cleanCode)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível consultar a cirurgia.');
      }

      const result = data as SearchResponse;

      setSurgeryData(result.cirurgia);
      setSelectedCode(result.cirurgia.codigo_solicitacao);
      setSearchTerm(result.cirurgia.codigo_solicitacao);
    } catch (error) {
      setSurgeryData(null);
      setSelectedCode(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro ao consultar a solicitação.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSurgeryList();
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanCode = searchTerm.trim();

    setErrorMessage('');
    setSurgeryData(null);
    setSelectedCode(null);

    if (!cleanCode) {
      setErrorMessage('Digite o código da solicitação.');
      return;
    }

    await loadSurgeryDetails(cleanCode);
  }

  function handleSelectSurgery(code: string) {
    setErrorMessage('');
    loadSurgeryDetails(code);
  }

  const filteredSurgeryList = surgeryList.filter(surgery => {
    const term = listFilter.trim().toLowerCase();

    if (!term) return true;

    return [
      surgery.codigo_solicitacao,
      surgery.paciente_nome,
      surgery.medico_nome,
      surgery.procedimento_nome,
      surgery.codigo_cirurgia
    ].some(value => value?.toLowerCase().includes(term));
  });

  const opmeStatus = surgeryData?.status_opme;
  const equipmentStatus = surgeryData?.status_equipamento;

  const opmeReady =
    opmeStatus === 'liberado' || opmeStatus === 'nao_aplicavel';

  const equipmentReady =
    equipmentStatus === 'liberado' || equipmentStatus === 'nao_aplicavel';

  const canProceed = Boolean(surgeryData && opmeReady && equipmentReady);

  const suppliers = surgeryData
    ? [...new Set(
        surgeryData.solicitacoes_opme
          .map(item => item.fornecedor_nome)
          .filter((name): name is string => Boolean(name))
      )]
    : [];

  function handleDistribution() {
    if (!surgeryData || !canProceed) return;

    navigate('/distribuicao', {
      state: {
        surgery: {
          id: surgeryData.id,
          code: surgeryData.codigo_solicitacao,
          patientName: surgeryData.paciente_nome,
          hospital: surgeryData.hospital_nome,
          procedureName: surgeryData.procedimento_nome,
          procedureCode: surgeryData.codigo_cirurgia,
          porte: surgeryData.porte
        }
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800">
          <Search className="h-8 w-8 text-brand" />
          Busca de Cirurgia
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Consulte as solicitações cadastradas ou pesquise diretamente pelo código.
        </p>
      </div>

      {/* Busca por código */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Digite o código da solicitação (ex: 001)"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-800 shadow-sm focus:border-brand focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? <RefreshCw className="h-5 w-5 animate-spin" />
              : <Search className="h-5 w-5" />}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {errorMessage && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMessage}
          </p>
        )}
      </div>

      {/* Listagem de solicitações */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <ClipboardList className="h-5 w-5 text-brand" />
              Solicitações cadastradas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Selecione uma solicitação para consultar os detalhes.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSurgeryList}
            disabled={listLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        <div className="mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={listFilter}
              onChange={event => setListFilter(event.target.value)}
              placeholder="Filtrar por código, paciente, médico ou procedimento..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {listError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {listError}
          </div>
        )}

        {listLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Carregando solicitações...
          </div>
        ) : filteredSurgeryList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />

            <p className="font-medium text-slate-700">
              {surgeryList.length === 0
                ? 'Nenhuma solicitação cadastrada.'
                : 'Nenhuma solicitação encontrada.'}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {surgeryList.length === 0
                ? 'As solicitações aparecerão aqui quando forem cadastradas.'
                : 'Tente pesquisar por outro código, paciente ou médico.'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 text-xs text-slate-500">
              Exibindo {filteredSurgeryList.length} de {surgeryList.length} solicitações
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-semibold">Código</th>
                    <th className="px-3 py-3 font-semibold">Paciente / Médico</th>
                    <th className="px-3 py-3 font-semibold">Procedimento</th>
                    <th className="px-3 py-3 font-semibold">Data</th>
                    <th className="px-3 py-3 font-semibold">Recursos</th>
                    <th className="px-3 py-3 text-right font-semibold">Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSurgeryList.map(surgery => (
                    <tr
                      key={surgery.id}
                      className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                        selectedCode === surgery.codigo_solicitacao
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-4">
                        <span className="font-semibold text-slate-800">
                          {surgery.codigo_solicitacao}
                        </span>

                        <p className="mt-1 text-xs text-slate-500">
                          Porte {surgery.porte || 'N/I'}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {surgery.paciente_nome || 'Paciente não informado'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {surgery.medico_nome || 'Médico não informado'}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <p className="text-sm text-slate-700">
                          {surgery.procedimento_nome || 'Não informado'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Código: {surgery.codigo_cirurgia || 'N/I'}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <p className="flex items-center gap-1.5 text-sm text-slate-700">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          {formatDate(surgery.data_agendamento)}
                        </p>

                        {surgery.hora_inicio_planejada && (
                          <p className="mt-1 text-xs text-slate-500">
                            {surgery.hora_inicio_planejada.slice(0, 5)}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge status={surgery.status_opme} />
                          <StatusBadge status={surgery.status_equipamento} />
                        </div>
                      </td>

                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSelectSurgery(surgery.codigo_solicitacao)}
                          disabled={loading}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                        >
                          <Eye className="h-4 w-4" />
                          Consultar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Detalhes da solicitação selecionada */}
      {surgeryData && (
        <div className="animate-fadeIn space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  Solicitação localizada
                </span>

                <h2 className="mt-1 text-xl font-bold text-slate-800">
                  {surgeryData.paciente_nome || 'Paciente não informado'}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({surgeryData.codigo_solicitacao})
                  </span>
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {formatKanbanStatus(surgeryData.status_kanban)}
                </p>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                canProceed
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {canProceed ? 'Pronta para distribuição' : 'Aguardando liberação de recursos'}
              </span>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <UserRound className="h-4 w-4" />
                  <span className="text-xs font-medium">Médico responsável</span>
                </div>

                <p className="font-semibold text-slate-800">
                  {surgeryData.medico_nome || 'Não informado'}
                </p>

                {surgeryData.medico_crm && (
                  <p className="mt-1 text-xs text-slate-500">
                    CRM: {surgeryData.medico_crm}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Hospital</span>
                </div>

                <p className="font-semibold text-slate-800">
                  {surgeryData.hospital_nome || 'Ainda não definido'}
                </p>

                {surgeryData.hospital_unidade && (
                  <p className="mt-1 text-xs text-slate-500">
                    {surgeryData.hospital_unidade}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-100 p-2.5 text-brand">
                      <Paintbrush className="h-6 w-6" />
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-slate-500">
                        Procedimento
                      </span>
                      <h3 className="font-bold text-slate-800">
                        {surgeryData.procedimento_nome || 'Não informado'}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Código: {surgeryData.codigo_cirurgia || 'Não informado'}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    Porte: {surgeryData.porte || 'Não informado'}
                  </p>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                  <p className="flex justify-between gap-2">
                    <span>Média:</span>
                    <strong>{formatDuration(surgeryData.tempo_medio_minutos)}</strong>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span>P75:</span>
                    <strong>{formatDuration(surgeryData.tempo_p75_minutos)}</strong>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span>P90:</span>
                    <strong>{formatDuration(surgeryData.tempo_p90_minutos)}</strong>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2.5 text-blue-600">
                    <Truck className="h-6 w-6" />
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-slate-500">
                      Fornecedor OPME
                    </span>
                    <h3 className="font-bold text-slate-800">
                      {suppliers.length > 0 ? suppliers.join(', ') : 'Ainda não definido'}
                    </h3>
                  </div>
                </div>

                <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                  O fornecedor será exibido quando estiver vinculado a uma solicitação de material.
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <span className="mb-3 block text-xs font-medium text-slate-500">
                    Status dos recursos
                  </span>

                  <div className="mb-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Package className="h-4 w-4" />
                        OPME
                      </span>
                      <StatusBadge status={surgeryData.status_opme} />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Monitor className="h-4 w-4" />
                        Equipamentos
                      </span>
                      <StatusBadge status={surgeryData.status_equipamento} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDistribution}
                  disabled={!canProceed}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-colors ${
                    !canProceed
                      ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                      : 'btn-primary'
                  }`}
                >
                  {!canProceed
                    ? <Lock className="h-4 w-4" />
                    : <ArrowRight className="h-4 w-4" />}
                  {!canProceed
                    ? 'Aguardando liberação'
                    : 'Prosseguir para Distribuição'}
                </button>
              </div>
            </div>
          </div>

          {/* Materiais previstos no catálogo */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
              <Package className="h-5 w-5 text-brand" />
              Materiais previstos no catálogo
            </h3>

            {surgeryData.materiais_catalogo.length > 0 ? (
              <div className="space-y-3">
                {surgeryData.materiais_catalogo.map(material => (
                  <div
                    key={material.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {material.nome_material}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {material.categoria || 'Categoria não informada'}
                      </p>
                    </div>

                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      material.obrigatorio
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {material.obrigatorio ? 'Obrigatório' : 'Opcional'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Nenhum material cadastrado no catálogo para este procedimento.
              </p>
            )}

            <p className="mt-3 text-xs text-slate-400">
              Os materiais acima são referências do catálogo, não representam solicitações já liberadas.
            </p>
          </div>

          {/* Solicitações efetivamente vinculadas */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-slate-800">
                Solicitações OPME vinculadas
              </h3>

              {surgeryData.solicitacoes_opme.length > 0 ? (
                <div className="space-y-3">
                  {surgeryData.solicitacoes_opme.map(item => (
                    <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                      <p className="text-sm font-medium text-slate-800">
                        {item.descricao_material || 'Material sem descrição'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">
                          {item.fornecedor_nome || 'Fornecedor não definido'}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-amber-700">
                  Ainda não existem solicitações OPME vinculadas a esta cirurgia.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-slate-800">
                Solicitações de equipamentos vinculadas
              </h3>

              {surgeryData.solicitacoes_equipamentos.length > 0 ? (
                <div className="space-y-3">
                  {surgeryData.solicitacoes_equipamentos.map(item => (
                    <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                      <p className="text-sm font-medium text-slate-800">
                        {item.nome_equipamento || 'Equipamento não identificado'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">
                          {item.higienizado_e_disponivel
                            ? 'Higienizado e disponível'
                            : 'Disponibilidade não confirmada'}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-amber-700">
                  Ainda não existem solicitações de equipamentos vinculadas a esta cirurgia.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
