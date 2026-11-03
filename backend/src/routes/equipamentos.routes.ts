import { Router, type Response } from "express";

import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../middlewares/auth.middleware.js";

const router = Router();

type Relation<T> = T | T[] | null;

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

/*
 * GET /equipamentos
 *
 * Lista as solicitações de equipamentos já vinculadas
 * às cirurgias.
 */
router.get(
  "/",
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("solicitacoes_equipamentos")
        .select(`
          id,
          agendamento_id,
          equipamento_id,
          status,
          higienizado_e_disponivel,
          atualizado_em,
          equipamentos (
            nome_equipamento,
            hospital_id
          ),
          agendamentos (
            codigo_solicitacao,
            data_agendamento,
            hora_inicio_planejada,
            pacientes ( nome ),
            medicos ( nome, crm ),
            hospitais ( nome, unidade ),
            tipos_cirurgia ( nome_procedimento )
          )
        `)
        .order("atualizado_em", { ascending: false });

      if (error) {
        console.error("Erro ao listar equipamentos:", error.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível carregar as solicitações de equipamentos."
        });
      }

      const items = (data ?? []).map((item: any) => {
        const equipamento = firstRelation(item.equipamentos);
        const agendamento = firstRelation(item.agendamentos);

        const paciente = firstRelation(agendamento?.pacientes);
        const medico = firstRelation(agendamento?.medicos);
        const hospital = firstRelation(agendamento?.hospitais);
        const procedimento = firstRelation(agendamento?.tipos_cirurgia);

        return {
          id: item.id,
          agendamento_id: item.agendamento_id,
          equipamento_id: item.equipamento_id,
          equipamento_nome: equipamento?.nome_equipamento ?? "Não informado",
          status: item.status,
          higienizado_e_disponivel: item.higienizado_e_disponivel,
          atualizado_em: item.atualizado_em,

          codigo_solicitacao: agendamento?.codigo_solicitacao ?? null,
          data_agendamento: agendamento?.data_agendamento ?? null,
          hora_inicio_planejada: agendamento?.hora_inicio_planejada ?? null,

          paciente_nome: paciente?.nome ?? "Não informado",
          medico_nome: medico?.nome ?? "Não informado",
          medico_crm: medico?.crm ?? null,
          hospital_nome: hospital?.nome ?? "Não informado",
          hospital_unidade: hospital?.unidade ?? null,
          procedimento_nome: procedimento?.nome_procedimento ?? "Não informado"
        };
      });

      return res.status(200).json({
        status: "success",
        items
      });
    } catch (error) {
      console.error("Erro inesperado ao listar equipamentos:", error);

      return res.status(500).json({
        status: "error",
        message: "Erro interno ao carregar equipamentos."
      });
    }
  }
);

/*
 * GET /equipamentos/disponiveis/:agendamentoId
 *
 * Retorna os equipamentos ativos do mesmo hospital
 * da cirurgia, excluindo os que já foram vinculados.
 */
router.get(
  "/disponiveis/:agendamentoId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agendamentoId = req.params.agendamentoId?.toString();

      if (!agendamentoId) {
        return res.status(400).json({
          status: "error",
          message: "Identificador da cirurgia não informado."
        });
      }

      const { data: agendamento, error: agendamentoError } = await supabase
        .from("agendamentos")
        .select("id, hospital_id")
        .eq("id", agendamentoId)
        .maybeSingle();

      if (agendamentoError) {
        console.error("Erro ao consultar cirurgia:", agendamentoError.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar a cirurgia."
        });
      }

      if (!agendamento) {
        return res.status(404).json({
          status: "error",
          message: "Cirurgia não encontrada."
        });
      }

      if (!agendamento.hospital_id) {
        return res.status(400).json({
          status: "error",
          message: "A cirurgia ainda não possui hospital definido."
        });
      }

      const { data: equipamentos, error: equipamentosError } = await supabase
        .from("equipamentos")
        .select("id, nome_equipamento, hospital_id")
        .eq("hospital_id", agendamento.hospital_id)
        .eq("ativo", true)
        .order("nome_equipamento");

      if (equipamentosError) {
        console.error("Erro ao consultar equipamentos:", equipamentosError.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar os equipamentos do hospital."
        });
      }

      const { data: vinculados, error: vinculadosError } = await supabase
        .from("solicitacoes_equipamentos")
        .select("equipamento_id")
        .eq("agendamento_id", agendamentoId);

      if (vinculadosError) {
        console.error("Erro ao consultar equipamentos vinculados:", vinculadosError.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível verificar os equipamentos já vinculados."
        });
      }

      const idsVinculados = new Set(
        (vinculados ?? []).map(item => item.equipamento_id)
      );

      const disponiveis = (equipamentos ?? []).filter(
        equipamento => !idsVinculados.has(equipamento.id)
      );

      return res.status(200).json({
        status: "success",
        items: disponiveis
      });
    } catch (error) {
      console.error("Erro inesperado ao consultar equipamentos disponíveis:", error);

      return res.status(500).json({
        status: "error",
        message: "Erro interno ao consultar equipamentos disponíveis."
      });
    }
  }
);

/*
 * POST /equipamentos
 *
 * Vincula equipamentos cadastrados a uma cirurgia.
 *
 * Body:
 * {
 *   "agendamento_id": "uuid",
 *   "equipamento_ids": ["uuid", "uuid"]
 * }
 */
router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { agendamento_id, equipamento_ids } = req.body as {
        agendamento_id?: string;
        equipamento_ids?: string[];
      };

      if (
        typeof agendamento_id !== "string" ||
        !Array.isArray(equipamento_ids) ||
        equipamento_ids.length === 0 ||
        !equipamento_ids.every(id => typeof id === "string")
      ) {
        return res.status(400).json({
          status: "error",
          message: "Informe a cirurgia e selecione pelo menos um equipamento."
        });
      }

      const idsUnicos = [...new Set(equipamento_ids)];

      if (idsUnicos.length !== equipamento_ids.length) {
        return res.status(400).json({
          status: "error",
          message: "A seleção contém equipamentos repetidos."
        });
      }

      const { data: agendamento, error: agendamentoError } = await supabase
        .from("agendamentos")
        .select("id, hospital_id")
        .eq("id", agendamento_id)
        .maybeSingle();

      if (agendamentoError) {
        console.error("Erro ao consultar cirurgia:", agendamentoError.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar a cirurgia."
        });
      }

      if (!agendamento) {
        return res.status(404).json({
          status: "error",
          message: "Cirurgia não encontrada."
        });
      }

      if (!agendamento.hospital_id) {
        return res.status(400).json({
          status: "error",
          message: "Defina o hospital da cirurgia antes de solicitar equipamentos."
        });
      }

      const { data: equipamentos, error: equipamentosError } = await supabase
        .from("equipamentos")
        .select("id, hospital_id, ativo")
        .in("id", idsUnicos);

      if (equipamentosError) {
        console.error("Erro ao validar equipamentos:", equipamentosError.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível validar os equipamentos selecionados."
        });
      }

      if ((equipamentos ?? []).length !== idsUnicos.length) {
        return res.status(400).json({
          status: "error",
          message: "Um ou mais equipamentos selecionados não existem."
        });
      }

      const selecaoValida = equipamentos!.every(
        equipamento =>
          equipamento.ativo === true &&
          equipamento.hospital_id === agendamento.hospital_id
      );

      if (!selecaoValida) {
        return res.status(400).json({
          status: "error",
          message: "Selecione apenas equipamentos ativos do hospital da cirurgia."
        });
      }

      const { data: existentes, error: existentesError } = await supabase
        .from("solicitacoes_equipamentos")
        .select("equipamento_id")
        .eq("agendamento_id", agendamento_id)
        .in("equipamento_id", idsUnicos);

      if (existentesError) {
        console.error("Erro ao verificar vínculos:", existentesError.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível verificar os equipamentos já solicitados."
        });
      }

      if ((existentes ?? []).length > 0) {
        return res.status(409).json({
          status: "error",
          message: "Um ou mais equipamentos já estão vinculados a esta cirurgia."
        });
      }

      const novosRegistros = idsUnicos.map(equipamentoId => ({
        agendamento_id,
        equipamento_id: equipamentoId,
        status: "pendente",
        higienizado_e_disponivel: false
      }));

      const { data: criados, error: insertError } = await supabase
        .from("solicitacoes_equipamentos")
        .insert(novosRegistros)
        .select("id, equipamento_id, status");

      if (insertError) {
        console.error("Erro ao criar solicitações:", insertError.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível criar as solicitações de equipamentos."
        });
      }

      const { error: parentError } = await supabase
        .from("agendamentos")
        .update({ status_equipamento: "pendente" })
        .eq("id", agendamento_id);

      if (parentError) {
        console.error("Erro ao atualizar status da cirurgia:", parentError.message);

        return res.status(500).json({
          status: "error",
          message: "As solicitações foram criadas, mas não foi possível atualizar o status geral da cirurgia.",
          solicitacoes_criadas: criados
        });
      }

      return res.status(201).json({
        status: "success",
        message: "Equipamentos vinculados à cirurgia.",
        items: criados
      });
    } catch (error) {
      console.error("Erro inesperado ao criar solicitações:", error);

      return res.status(500).json({
        status: "error",
        message: "Erro interno ao criar solicitações de equipamentos."
      });
    }
  }
);

/*
 * PATCH /equipamentos/:id/validar
 *
 * Confirma ou retira a confirmação de higienização
 * e disponibilidade de um equipamento.
 */
router.patch(
  "/:id/validar",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id?.toString();
      const { higienizado_e_disponivel } = req.body as {
        higienizado_e_disponivel?: boolean;
      };

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Identificador da solicitação não informado."
        });
      }

      if (typeof higienizado_e_disponivel !== "boolean") {
        return res.status(400).json({
          status: "error",
          message: "Informe se o equipamento está higienizado e disponível."
        });
      }

      const novoStatus = higienizado_e_disponivel
        ? "liberado"
        : "pendente";

      const { data: solicitacao, error: updateError } = await supabase
        .from("solicitacoes_equipamentos")
        .update({
          higienizado_e_disponivel,
          status: novoStatus,
          atualizado_em: new Date().toISOString()
        })
        .eq("id", id)
        .select("id, agendamento_id, status, higienizado_e_disponivel")
        .maybeSingle();

      if (updateError) {
        console.error("Erro ao validar equipamento:", updateError.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível atualizar o equipamento."
        });
      }

      if (!solicitacao) {
        return res.status(404).json({
          status: "error",
          message: "Solicitação de equipamento não encontrada."
        });
      }

      const { data: solicitacoes, error: listError } = await supabase
        .from("solicitacoes_equipamentos")
        .select("status, higienizado_e_disponivel")
        .eq("agendamento_id", solicitacao.agendamento_id);

      if (listError) {
        console.error("Erro ao consultar solicitações:", listError.message);

        return res.status(500).json({
          status: "error",
          message: "Equipamento atualizado, mas não foi possível recalcular o status geral."
        });
      }

      const todasLiberadas =
        (solicitacoes ?? []).length > 0 &&
        solicitacoes!.every(
          item =>
            item.status === "liberado" &&
            item.higienizado_e_disponivel === true
        );

      const statusGeral = todasLiberadas ? "liberado" : "pendente";

      const { error: parentError } = await supabase
        .from("agendamentos")
        .update({ status_equipamento: statusGeral })
        .eq("id", solicitacao.agendamento_id);

      if (parentError) {
        console.error("Erro ao atualizar status geral:", parentError.message);

        return res.status(500).json({
          status: "error",
          message: "Equipamento atualizado, mas o status geral da cirurgia não pôde ser atualizado."
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Disponibilidade do equipamento atualizada.",
        item: solicitacao,
        status_geral: statusGeral
      });
    } catch (error) {
      console.error("Erro inesperado ao validar equipamento:", error);

      return res.status(500).json({
        status: "error",
        message: "Erro interno ao validar equipamento."
      });
    }
  }
);

export default router;