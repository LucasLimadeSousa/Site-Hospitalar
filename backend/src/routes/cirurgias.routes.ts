
import { Router, type Response } from "express";

import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../middlewares/auth.middleware.js";

const router = Router();

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

// LISTAR SOLICITAÇÕES
router.get(
  "/",
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
          id,
          codigo_solicitacao,
          status_opme,
          status_equipamento,
          status_kanban,
          data_agendamento,
          hora_inicio_planejada,
          criado_em,
          pacientes ( nome ),
          medicos ( nome, crm ),
          hospitais ( nome, unidade ),
          tipos_cirurgia (
            codigo_cirurgia,
            nome_procedimento,
            porte
          )
        `)
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("Erro ao listar solicitações:", error.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível carregar as solicitações."
        });
      }

      const cirurgias = (data ?? []).map(item => {
        const paciente = firstRelation(item.pacientes);
        const medico = firstRelation(item.medicos);
        const hospital = firstRelation(item.hospitais);
        const procedimento = firstRelation(item.tipos_cirurgia);

        return {
          id: item.id,
          codigo_solicitacao: item.codigo_solicitacao,
          paciente_nome: paciente?.nome ?? null,
          medico_nome: medico?.nome ?? null,
          medico_crm: medico?.crm ?? null,
          hospital_nome: hospital?.nome ?? null,
          hospital_unidade: hospital?.unidade ?? null,
          codigo_cirurgia: procedimento?.codigo_cirurgia ?? null,
          procedimento_nome: procedimento?.nome_procedimento ?? null,
          porte: procedimento?.porte ?? null,
          status_opme: item.status_opme,
          status_equipamento: item.status_equipamento,
          status_kanban: item.status_kanban,
          data_agendamento: item.data_agendamento,
          hora_inicio_planejada: item.hora_inicio_planejada,
          criado_em: item.criado_em
        };
      });

      return res.status(200).json({
        status: "success",
        total: cirurgias.length,
        cirurgias
      });
    } catch (error) {
      console.error("Erro inesperado ao listar solicitações:", error);

      return res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao carregar as solicitações."
      });
    }
  }
);

// BUSCAR SOLICITAÇÃO PELO CÓDIGO
router.get(
  "/:codigo",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const codigo = req.params.codigo?.toString().trim();

      if (!codigo) {
        return res.status(400).json({
          status: "error",
          message: "Informe o código da solicitação."
        });
      }

      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
          id,
          codigo_solicitacao,
          status_opme,
          status_equipamento,
          status_kanban,
          data_agendamento,
          hora_inicio_planejada,
          cliente_confirmado_24h,
          pacientes ( nome ),
          medicos ( nome, crm ),
          hospitais ( nome, unidade ),
          tipos_cirurgia (
            codigo_cirurgia,
            nome_procedimento,
            porte,
            tempo_medio_minutos,
            tempo_p75_minutos,
            tempo_p90_minutos,
            catalogo_materiais (
              id,
              nome_material,
              categoria,
              obrigatorio
            )
          ),
          solicitacoes_opme (
            id,
            descricao_material,
            status,
            fornecedores_opme ( nome_fornecedor )
          ),
          solicitacoes_equipamentos (
            id,
            status,
            higienizado_e_disponivel,
            equipamentos ( nome_equipamento )
          )
        `)
        .eq("codigo_solicitacao", codigo)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar cirurgia:", error.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar a solicitação."
        });
      }

      if (!data) {
        return res.status(404).json({
          status: "error",
          message: "Solicitação não encontrada."
        });
      }

      const paciente = firstRelation(data.pacientes);
      const medico = firstRelation(data.medicos);
      const hospital = firstRelation(data.hospitais);
      const procedimento = firstRelation(data.tipos_cirurgia);

      const materiaisCatalogo = procedimento?.catalogo_materiais ?? [];

      const solicitacoesOpme = (data.solicitacoes_opme ?? []).map(item => {
        const fornecedor = firstRelation(item.fornecedores_opme);

        return {
          id: item.id,
          descricao_material: item.descricao_material,
          status: item.status,
          fornecedor_nome: fornecedor?.nome_fornecedor ?? null
        };
      });

      const solicitacoesEquipamentos = (
        data.solicitacoes_equipamentos ?? []
      ).map(item => {
        const equipamento = firstRelation(item.equipamentos);

        return {
          id: item.id,
          nome_equipamento: equipamento?.nome_equipamento ?? null,
          status: item.status,
          higienizado_e_disponivel: item.higienizado_e_disponivel
        };
      });

      return res.status(200).json({
        status: "success",
        cirurgia: {
          id: data.id,
          codigo_solicitacao: data.codigo_solicitacao,
          paciente_nome: paciente?.nome ?? null,
          medico_nome: medico?.nome ?? null,
          medico_crm: medico?.crm ?? null,
          hospital_nome: hospital?.nome ?? null,
          hospital_unidade: hospital?.unidade ?? null,
          codigo_cirurgia: procedimento?.codigo_cirurgia ?? null,
          procedimento_nome: procedimento?.nome_procedimento ?? null,
          porte: procedimento?.porte ?? null,
          tempo_medio_minutos: procedimento?.tempo_medio_minutos ?? null,
          tempo_p75_minutos: procedimento?.tempo_p75_minutos ?? null,
          tempo_p90_minutos: procedimento?.tempo_p90_minutos ?? null,
          materiais_catalogo: materiaisCatalogo,
          solicitacoes_opme: solicitacoesOpme,
          solicitacoes_equipamentos: solicitacoesEquipamentos,
          status_opme: data.status_opme,
          status_equipamento: data.status_equipamento,
          status_kanban: data.status_kanban,
          data_agendamento: data.data_agendamento,
          hora_inicio_planejada: data.hora_inicio_planejada,
          cliente_confirmado_24h: data.cliente_confirmado_24h
        }
      });
    } catch (error) {
      console.error("Erro inesperado ao buscar cirurgia:", error);

      return res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao consultar a cirurgia."
      });
    }
  }
);

export default router;
