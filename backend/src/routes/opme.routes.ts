
import { Router, type Response } from "express";
import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";

const router = Router();

type Relation<T> = T | T[] | null;

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

interface OpmeRow {
  id: string;
  agendamento_id: string;
  descricao_material: string;
  status: "pendente" | "liberado";
  fornecedores_opme: Relation<{ nome_fornecedor: string }>;
  agendamentos: Relation<{
    codigo_solicitacao: string;
    pacientes: Relation<{ nome: string }>;
    medicos: Relation<{ nome: string }>;
    tipos_cirurgia: Relation<{ nome_procedimento: string }>;
  }>;
}

const STATUS_QUE_PERMITEM_ALTERACAO = [
  "aguardando_liberacao",
  "pronta_para_agendamento",
] as const;

async function verificarPermissaoAlteracao(agendamentoId: string) {
  const { data: agendamento, error } = await supabase
    .from("agendamentos")
    .select("status_kanban")
    .eq("id", agendamentoId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao verificar status da cirurgia:", error.message);

    return {
      permitido: false,
      erro: true,
    };
  }

  if (!agendamento) {
    return {
      permitido: false,
      erro: false,
      naoEncontrado: true,
    };
  }

  const permitido = STATUS_QUE_PERMITEM_ALTERACAO.includes(
    agendamento.status_kanban as (typeof STATUS_QUE_PERMITEM_ALTERACAO)[number]
  );

  return {
    permitido,
    erro: false,
  };
}

// Lista as solicitações reais de OPME.
router.get(
  "/",
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("solicitacoes_opme")
        .select(`
          id,
          agendamento_id,
          descricao_material,
          status,
          fornecedores_opme (
            nome_fornecedor
          ),
          agendamentos (
            codigo_solicitacao,
            pacientes ( nome ),
            medicos ( nome ),
            tipos_cirurgia ( nome_procedimento )
          )
        `)
        .order("atualizado_em", { ascending: false });

      if (error) {
        console.error("Erro ao listar OPME:", error.message);
        return res.status(500).json({
          status: "error",
          message: "Não foi possível carregar as solicitações de OPME.",
        });
      }

      const items = ((data ?? []) as unknown as OpmeRow[]).map((item) => {
        const agendamento = firstRelation(item.agendamentos);
        const paciente = firstRelation(agendamento?.pacientes);
        const medico = firstRelation(agendamento?.medicos);
        const procedimento = firstRelation(agendamento?.tipos_cirurgia);
        const fornecedor = firstRelation(item.fornecedores_opme);

        return {
          id: item.id,
          agendamento_id: item.agendamento_id,
          codigo: agendamento?.codigo_solicitacao ?? "Não informado",
          paciente: paciente?.nome ?? "Não informado",
          cirurgia: procedimento?.nome_procedimento ?? "Não informado",
          medico: medico?.nome ?? "Não informado",
          fornecedor: fornecedor?.nome_fornecedor ?? null,
          material: item.descricao_material,
          status: item.status,
        };
      });

      return res.status(200).json({
        status: "success",
        items,
      });
    } catch (error) {
      console.error("Erro inesperado ao listar OPME:", error);
      return res.status(500).json({
        status: "error",
        message: "Erro interno ao carregar OPME.",
      });
    }
  }
);

// Lista os fornecedores disponíveis para vincular às solicitações.
router.get(
  "/fornecedores",
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("fornecedores_opme")
        .select("id, nome_fornecedor")
        .order("nome_fornecedor", { ascending: true });

      if (error) {
        console.error("Erro ao listar fornecedores de OPME:", error.message);
        return res.status(500).json({
          status: "error",
          message: "Não foi possível carregar os fornecedores.",
        });
      }

      return res.status(200).json({
        status: "success",
        items: data ?? [],
      });
    } catch (error) {
      console.error("Erro inesperado ao listar fornecedores:", error);
      return res.status(500).json({
        status: "error",
        message: "Erro interno ao carregar fornecedores.",
      });
    }
  }
);

// Cria solicitações usando somente materiais do catálogo
// associado ao tipo de cirurgia do agendamento.
router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as {
        agendamento_id?: string;
        materiais?: string[];
        fornecedor_id?: string | null;
      };

      const agendamentoId = body.agendamento_id?.trim();
      const materiais = body.materiais;
      const fornecedorId = body.fornecedor_id?.trim() || null;

      if (!agendamentoId) {
        return res.status(400).json({
          status: "error",
          message: "O agendamento não foi informado.",
        });
      }

      if (
        !Array.isArray(materiais) ||
        materiais.length === 0 ||
        materiais.some((id) => typeof id !== "string" || !id.trim())
      ) {
        return res.status(400).json({
          status: "error",
          message: "Selecione pelo menos um material do catálogo.",
        });
      }

      const materiaisUnicos = [...new Set(materiais.map((id) => id.trim()))];

      if (materiaisUnicos.length !== materiais.length) {
        return res.status(400).json({
          status: "error",
          message: "A lista contém materiais duplicados.",
        });
      }

      // Confirma que o agendamento existe e identifica seu procedimento.
      const { data: agendamento, error: agendamentoError } = await supabase
        .from("agendamentos")
        .select("id, tipo_cirurgia_id")
        .eq("id", agendamentoId)
        .maybeSingle();

      if (agendamentoError) {
        console.error("Erro ao consultar agendamento:", agendamentoError.message);
        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar a cirurgia.",
        });
      }

      if (!agendamento) {
        return res.status(404).json({
          status: "error",
          message: "Cirurgia não encontrada.",
        });
      }

      // Impede alterações após a distribuição.
      const permissao = await verificarPermissaoAlteracao(agendamentoId);

      if (permissao.erro) {
        return res.status(500).json({
          status: "error",
          message: "Não foi possível verificar se a cirurgia permite alterações.",
        });
      }

      if (!permissao.permitido) {
        return res.status(409).json({
          status: "error",
          message: "Esta cirurgia não permite mais alterações no OPME.",
        });
      }

      // Confere se todos os materiais pertencem ao procedimento.
      const { data: materiaisCatalogo, error: catalogoError } = await supabase
        .from("catalogo_materiais")
        .select("id, nome_material")
        .eq("tipo_cirurgia_id", agendamento.tipo_cirurgia_id)
        .in("id", materiaisUnicos);

      if (catalogoError) {
        console.error("Erro ao consultar catálogo:", catalogoError.message);
        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar o catálogo de materiais.",
        });
      }

      if ((materiaisCatalogo ?? []).length !== materiaisUnicos.length) {
        return res.status(400).json({
          status: "error",
          message: "Um ou mais materiais não pertencem ao catálogo desta cirurgia.",
        });
      }

      // O fornecedor é opcional, mas, se informado, precisa existir.
      if (fornecedorId) {
        const { data: fornecedor, error: fornecedorError } = await supabase
          .from("fornecedores_opme")
          .select("id")
          .eq("id", fornecedorId)
          .maybeSingle();

        if (fornecedorError) {
          console.error("Erro ao consultar fornecedor:", fornecedorError.message);
          return res.status(500).json({
            status: "error",
            message: "Não foi possível validar o fornecedor.",
          });
        }

        if (!fornecedor) {
          return res.status(404).json({
            status: "error",
            message: "Fornecedor não encontrado.",
          });
        }
      }

      // Evita cadastrar novamente um material já solicitado
      // para o mesmo agendamento.
      const { data: solicitacoesExistentes, error: existentesError } =
        await supabase
          .from("solicitacoes_opme")
          .select("descricao_material")
          .eq("agendamento_id", agendamentoId);

      if (existentesError) {
        console.error("Erro ao consultar solicitações existentes:", existentesError.message);
        return res.status(500).json({
          status: "error",
          message: "Não foi possível verificar as solicitações existentes.",
        });
      }

      const descricoesExistentes = new Set(
        (solicitacoesExistentes ?? []).map((item) => item.descricao_material)
      );

      const materiaisNovos = materiaisCatalogo.filter(
        (material) => !descricoesExistentes.has(material.nome_material)
      );

      if (materiaisNovos.length === 0) {
        return res.status(409).json({
          status: "error",
          message: "Todos os materiais selecionados já foram solicitados para esta cirurgia.",
        });
      }

      const novasSolicitacoes = materiaisNovos.map((material) => ({
        agendamento_id: agendamentoId,
        fornecedor_id: fornecedorId,
        descricao_material: material.nome_material,
        status: "pendente" as const,
      }));

      const { data: criadas, error: insertError } = await supabase
        .from("solicitacoes_opme")
        .insert(novasSolicitacoes)
        .select("id, agendamento_id, descricao_material, status, fornecedor_id");

      if (insertError) {
        console.error("Erro ao criar solicitações de OPME:", insertError.message);
        return res.status(500).json({
          status: "error",
          message: "Não foi possível criar as solicitações de OPME.",
        });
      }

      // Qualquer nova solicitação deixa o status geral pendente.
      const { error: parentError } = await supabase
        .from("agendamentos")
        .update({ status_opme: "pendente" })
        .eq("id", agendamentoId);

      if (parentError) {
        console.error("Erro ao atualizar status geral de OPME:", parentError.message);
        return res.status(500).json({
          status: "error",
          message: "As solicitações foram criadas, mas o status geral da cirurgia não pôde ser atualizado.",
        });
      }

      return res.status(201).json({
        status: "success",
        message: "Solicitações de OPME criadas com sucesso.",
        items: criadas ?? [],
      });
    } catch (error) {
      console.error("Erro inesperado ao criar solicitações de OPME:", error);
      return res.status(500).json({
        status: "error",
        message: "Erro interno ao criar solicitações de OPME.",
      });
    }
  }
);

// Atualiza o status de uma solicitação existente.
router.patch(
  "/:id/status",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id?.toString();
      const { status } = req.body as { status?: string };

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Identificador da solicitação não informado.",
        });
      }

      if (status !== "pendente" && status !== "liberado") {
        return res.status(400).json({
          status: "error",
          message: "Status inválido.",
        });
      }

      // Consulta a solicitação para identificar a cirurgia vinculada.
      const { data: solicitacaoAtual, error: consultaError } = await supabase
        .from("solicitacoes_opme")
        .select("id, agendamento_id")
        .eq("id", id)
        .maybeSingle();

      if (consultaError) {
        console.error("Erro ao consultar solicitação de OPME:", consultaError.message);
        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar a solicitação.",
        });
      }

      if (!solicitacaoAtual) {
        return res.status(404).json({
          status: "error",
          message: "Solicitação de OPME não encontrada.",
        });
      }

      // Impede alterações após a distribuição.
      const permissao = await verificarPermissaoAlteracao(
        solicitacaoAtual.agendamento_id
      );

      if (permissao.erro) {
        return res.status(500).json({
          status: "error",
          message: "Não foi possível verificar se a cirurgia permite alterações.",
        });
      }

      if (!permissao.permitido) {
        return res.status(409).json({
          status: "error",
          message: "Esta cirurgia não permite mais alterações no OPME.",
        });
      }

      const { data: solicitacao, error: updateError } = await supabase
        .from("solicitacoes_opme")
        .update({
          status,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, agendamento_id")
        .maybeSingle();

      if (updateError) {
        console.error("Erro ao atualizar OPME:", updateError.message);
        return res.status(500).json({
          status: "error",
          message: "Não foi possível atualizar a solicitação.",
        });
      }

      if (!solicitacao) {
        return res.status(404).json({
          status: "error",
          message: "Solicitação de OPME não encontrada.",
        });
      }

      // Recalcula o status geral com base em todas as solicitações.
      const { data: solicitacoes, error: listError } = await supabase
        .from("solicitacoes_opme")
        .select("status")
        .eq("agendamento_id", solicitacao.agendamento_id);

      if (listError) {
        console.error("Erro ao consultar status das solicitações:", listError.message);
        return res.status(500).json({
          status: "error",
          message: "A solicitação foi atualizada, mas não foi possível recalcular o status geral.",
        });
      }

      const todasLiberadas =
        (solicitacoes ?? []).length > 0 &&
        solicitacoes!.every((item) => item.status === "liberado");

      const statusGeral = todasLiberadas ? "liberado" : "pendente";

      const { error: parentError } = await supabase
        .from("agendamentos")
        .update({ status_opme: statusGeral })
        .eq("id", solicitacao.agendamento_id);

      if (parentError) {
        console.error("Erro ao atualizar status geral de OPME:", parentError.message);
        return res.status(500).json({
          status: "error",
          message: "A solicitação foi atualizada, mas o status geral não pôde ser atualizado.",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Status da solicitação atualizado.",
        status_solicitacao: status,
        status_geral: statusGeral,
      });
    } catch (error) {
      console.error("Erro inesperado ao atualizar OPME:", error);
      return res.status(500).json({
        status: "error",
        message: "Erro interno ao atualizar a solicitação.",
      });
    }
  }
);

export default router;
