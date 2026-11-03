import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  PackagePlus,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type StatusOpme = "pendente" | "liberado";
type StatusFiltro = "todos" | StatusOpme;

interface OpmeItem {
  id: string;
  agendamento_id: string;
  codigo: string;
  paciente: string;
  surgeryName: string;
  doctor: string;
  supplier: string | null;
  material: string;
  status: StatusOpme;
}

interface OpmeItemFromApi {
  id: string;
  agendamento_id: string;
  codigo: string;
  paciente: string;
  cirurgia: string;
  medico: string;
  fornecedor: string | null;
  material: string;
  status: StatusOpme;
}

interface OpmeResponse {
  status: string;
  message?: string;
  items?: OpmeItemFromApi[];
}

interface MaterialCatalogo {
  id: string;
  nome_material: string;
  categoria: string | null;
  obrigatorio: boolean;
}

interface Cirurgia {
  id: string;
  codigo_solicitacao: string;
  paciente_nome: string;
  medico_nome: string;
  procedimento_nome: string;
  materiais_catalogo: MaterialCatalogo[];
}

interface CirurgiaResponse {
  status: string;
  message?: string;
  cirurgia: Cirurgia;
}

interface Fornecedor {
  id: string;
  nome_fornecedor: string;
}

interface ListaFornecedoresResponse {
  status: string;
  message?: string;
  items?: Fornecedor[];
}

export function Opme() {
  const [items, setItems] = useState<OpmeItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<OpmeItem | null>(null);

  const [search, setSearch] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  // Estados do cadastro de OPME
  const [showAddModal, setShowAddModal] = useState(false);
  const [codigoCirurgia, setCodigoCirurgia] = useState("");
  const [searchingSurgery, setSearchingSurgery] = useState(false);
  const [surgery, setSurgery] = useState<Cirurgia | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Fornecedor[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [addError, setAddError] = useState("");

  const getToken = () => sessionStorage.getItem("core_token");

  const apiRequest = async <T,>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = getToken();

    if (!token) {
      throw new Error("Sessão não encontrada. Faça login novamente.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || data.status === "error") {
      throw new Error(data.message || "Não foi possível concluir a operação.");
    }

    return data as T;
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErro("");

    try {
      const data = await apiRequest<OpmeResponse>("/opme");

      const mappedItems: OpmeItem[] = (data.items ?? []).map((item) => ({
        id: item.id,
        agendamento_id: item.agendamento_id,
        codigo: item.codigo,
        paciente: item.paciente,
        surgeryName: item.cirurgia,
        doctor: item.medico,
        supplier: item.fornecedor,
        material: item.material,
        status: item.status,
      }));

      setItems(mappedItems);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as solicitações de OPME."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);

    try {
      const data =
        await apiRequest<ListaFornecedoresResponse>("/opme/fornecedores");

      setSuppliers(data.items ?? []);
    } catch (error) {
      setAddError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os fornecedores."
      );
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const openAddModal = () => {
    setCodigoCirurgia("");
    setSurgery(null);
    setSelectedMaterials([]);
    setSelectedSupplier("");
    setAddError("");
    setShowAddModal(true);
    void loadSuppliers();
  };

  const closeAddModal = () => {
    if (savingRequest) return;

    setShowAddModal(false);
    setSurgery(null);
    setSelectedMaterials([]);
    setAddError("");
  };

  const searchSurgery = async () => {
    const code = codigoCirurgia.trim();

    if (!code) {
      setAddError("Informe o código da cirurgia.");
      return;
    }

    setSearchingSurgery(true);
    setAddError("");
    setSurgery(null);
    setSelectedMaterials([]);

    try {
      const data = await apiRequest<CirurgiaResponse>(
        `/cirurgias/${encodeURIComponent(code)}`
      );

      setSurgery(data.cirurgia);

      if (!data.cirurgia.materiais_catalogo?.length) {
        setAddError(
          "Essa cirurgia não possui materiais cadastrados no catálogo."
        );
      }
    } catch (error) {
      setAddError(
        error instanceof Error
          ? error.message
          : "Não foi possível localizar a cirurgia."
      );
    } finally {
      setSearchingSurgery(false);
    }
  };

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterials((previous) =>
      previous.includes(materialId)
        ? previous.filter((id) => id !== materialId)
        : [...previous, materialId]
    );
  };

  const createRequest = async () => {
    if (!surgery) {
      setAddError("Localize uma cirurgia antes de continuar.");
      return;
    }

    if (selectedMaterials.length === 0) {
      setAddError("Selecione pelo menos um material.");
      return;
    }

    setSavingRequest(true);
    setAddError("");

    try {
      await apiRequest("/opme", {
        method: "POST",
        body: JSON.stringify({
          agendamento_id: surgery.id,
          materiais: selectedMaterials,
          fornecedor_id: selectedSupplier || null,
        }),
      });

      setMensagem("Solicitação de OPME cadastrada com sucesso.");
      setShowAddModal(false);
      setSurgery(null);
      setSelectedMaterials([]);
      setSelectedSupplier("");

      await loadItems();
    } catch (error) {
      setAddError(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar a solicitação."
      );
    } finally {
      setSavingRequest(false);
    }
  };

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          item.codigo,
          item.surgeryName,
          item.doctor,
          item.supplier ?? "",
          item.material,
          item.paciente,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesStatus =
        statusFiltro === "todos" || item.status === statusFiltro;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFiltro]);

  const updateStatus = async (item: OpmeItem) => {
    const newStatus: StatusOpme =
      item.status === "pendente" ? "liberado" : "pendente";

    setUpdatingId(item.id);
    setErro("");
    setMensagem("");

    try {
      await apiRequest(`/opme/${encodeURIComponent(item.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      setItems((previousItems) =>
        previousItems.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, status: newStatus }
            : currentItem
        )
      );

      setSelectedItem((current) =>
        current?.id === item.id
          ? { ...current, status: newStatus }
          : current
      );

      setMensagem("Status atualizado e salvo com sucesso.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar a solicitação."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = items.filter(
    (item) => item.status === "pendente"
  ).length;

  const releasedCount = items.filter(
    (item) => item.status === "liberado"
  ).length;

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800">
            <Package className="h-8 w-8 text-brand" />
            OPME
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Acompanhe as solicitações de materiais especiais e suas liberações
            junto aos fornecedores.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          <PackagePlus className="h-4 w-4" />
          Nova solicitação
        </button>
      </div>

      {/* Indicadores */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-amber-100 p-3">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Pendentes</p>
            <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-emerald-100 p-3">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Liberadas</p>
            <p className="text-2xl font-bold text-slate-800">{releasedCount}</p>
          </div>
        </div>
      </div>

      {/* Pesquisa e filtros */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, cirurgia, médico ou fornecedor..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-brand"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={statusFiltro}
            onChange={(event) =>
              setStatusFiltro(event.target.value as StatusFiltro)
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="liberado">Liberado</option>
          </select>

          <button
            type="button"
            onClick={() => void loadItems()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Mensagens */}
      {erro && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {mensagem}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="p-4">Código</th>
              <th className="p-4">Cirurgia</th>
              <th className="p-4">Médico</th>
              <th className="p-4">Fornecedor</th>
              <th className="p-4">Material</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-500">
                  Carregando solicitações de OPME...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-500">
                  {items.length === 0
                    ? "Nenhuma solicitação de OPME cadastrada."
                    : "Nenhuma solicitação corresponde à sua pesquisa."}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="p-4 font-bold text-slate-800">{item.codigo}</td>
                  <td className="p-4 font-medium text-slate-700">
                    {item.surgeryName}
                  </td>
                  <td className="p-4 text-slate-600">{item.doctor}</td>
                  <td className="p-4 text-slate-600">
                    {item.supplier || "Não definido"}
                  </td>
                  <td className="max-w-xs p-4 text-slate-600">
                    {item.material}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === "liberado"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status === "liberado" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {item.status === "liberado" ? "Liberado" : "Pendente"}
                      </span>

                      <label
                        className={`relative inline-flex items-center ${
                          updatingId === item.id
                            ? "cursor-wait opacity-50"
                            : "cursor-pointer"
                        }`}
                        title="Alterar status da solicitação"
                      >
                        <input
                          type="checkbox"
                          checked={item.status === "liberado"}
                          disabled={updatingId !== null}
                          onChange={() => void updateStatus(item)}
                          className="peer sr-only"
                        />
                        <span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
                        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full border border-slate-300 bg-white transition peer-checked:translate-x-4 peer-checked:border-white" />
                      </label>
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de cadastro */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="opme-add-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2
                  id="opme-add-title"
                  className="text-lg font-bold text-slate-800"
                >
                  Nova solicitação de OPME
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Localize a cirurgia e selecione os materiais do catálogo.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                disabled={savingRequest}
                aria-label="Fechar cadastro"
                className="text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Busca da cirurgia */}
            <div className="mb-5">
              <label
                htmlFor="codigo-cirurgia"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Código da solicitação
              </label>

              <div className="flex gap-2">
                <input
                  id="codigo-cirurgia"
                  value={codigoCirurgia}
                  onChange={(event) => setCodigoCirurgia(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void searchSurgery();
                  }}
                  placeholder="Ex.: 001"
                  disabled={searchingSurgery || savingRequest}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                />

                <button
                  type="button"
                  onClick={() => void searchSurgery()}
                  disabled={searchingSurgery || savingRequest}
                  className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  {searchingSurgery ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            {/* Dados da cirurgia */}
            {surgery && (
              <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-800">
                  Cirurgia localizada
                </h3>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <p>
                    <strong className="text-slate-700">Código:</strong>{" "}
                    {surgery.codigo_solicitacao}
                  </p>
                  <p>
                    <strong className="text-slate-700">Paciente:</strong>{" "}
                    {surgery.paciente_nome}
                  </p>
                  <p>
                    <strong className="text-slate-700">Procedimento:</strong>{" "}
                    {surgery.procedimento_nome}
                  </p>
                  <p>
                    <strong className="text-slate-700">Médico:</strong>{" "}
                    {surgery.medico_nome}
                  </p>
                </div>
              </div>
            )}

            {/* Catálogo de materiais */}
            {surgery && surgery.materiais_catalogo?.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  Materiais disponíveis no catálogo
                </h3>

                <p className="mb-3 text-xs text-slate-500">
                  Selecione os materiais que devem ser incluídos nesta
                  solicitação.
                </p>

                <div className="space-y-2">
                  {surgery.materiais_catalogo.map((material) => (
                    <label
                      key={material.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMaterials.includes(material.id)}
                        onChange={() => toggleMaterial(material.id)}
                        disabled={savingRequest}
                        className="mt-1 h-4 w-4 accent-blue-600"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">
                          {material.nome_material}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {material.categoria || "Sem categoria"}
                          {material.obrigatorio
                            ? " • Obrigatório no catálogo"
                            : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Fornecedor */}
            {surgery && (
              <div className="mb-5">
                <label
                  htmlFor="fornecedor-opme"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Fornecedor
                </label>

                <select
                  id="fornecedor-opme"
                  value={selectedSupplier}
                  onChange={(event) => setSelectedSupplier(event.target.value)}
                  disabled={loadingSuppliers || savingRequest}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                >
                  <option value="">Não definido</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.nome_fornecedor}
                    </option>
                  ))}
                </select>

                {loadingSuppliers && (
                  <p className="mt-1 text-xs text-slate-500">
                    Carregando fornecedores...
                  </p>
                )}
              </div>
            )}

            {addError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {addError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeAddModal}
                disabled={savingRequest}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void createRequest()}
                disabled={
                  !surgery ||
                  selectedMaterials.length === 0 ||
                  savingRequest
                }
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingRequest ? "Salvando..." : "Cadastrar solicitação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedItem(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="opme-modal-title"
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3
                id="opme-modal-title"
                className="text-lg font-bold text-slate-800"
              >
                Detalhes da Solicitação
              </h3>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Fechar detalhes"
                className="text-slate-400 transition hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-sm">
                <strong className="text-slate-700">Código:</strong>{" "}
                {selectedItem.codigo}
              </p>
              <p className="text-sm">
                <strong className="text-slate-700">Paciente:</strong>{" "}
                {selectedItem.paciente}
              </p>
              <p className="text-sm">
                <strong className="text-slate-700">Procedimento:</strong>{" "}
                {selectedItem.surgeryName}
              </p>
              <p className="text-sm">
                <strong className="text-slate-700">
                  Médico responsável:
                </strong>{" "}
                {selectedItem.doctor}
              </p>
              <p className="text-sm">
                <strong className="text-slate-700">Fornecedor:</strong>{" "}
                {selectedItem.supplier || "Não definido"}
              </p>

              <div>
                <strong className="mb-2 block text-sm text-slate-700">
                  Material solicitado:
                </strong>
                <ul className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <li>{selectedItem.material}</li>
                </ul>
              </div>

              <p className="text-sm">
                <strong className="text-slate-700">Status:</strong>{" "}
                {selectedItem.status === "liberado" ? "Liberado" : "Pendente"}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}