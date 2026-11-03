import { Router, type Response } from "express";

import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const { data: agendamentos, error } = await supabase
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
          pacientes (
            nome
          ),
          hospitais (
            nome,
            unidade
          ),
          medicos (
            nome
          ),
          tipos_cirurgia (
            codigo_cirurgia,
            nome_procedimento,
            porte,
            tempo_medio_minutos,
            tempo_p75_minutos,
            tempo_p90_minutos
          )
        `)
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("Erro ao buscar agendamentos:", error);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível carregar os agendamentos."
        });
      }

      const resultado = (agendamentos ?? []).map((agendamento) => {
        const paciente = Array.isArray(agendamento.pacientes)
          ? agendamento.pacientes[0]
          : agendamento.pacientes;

        const hospital = Array.isArray(agendamento.hospitais)
          ? agendamento.hospitais[0]
          : agendamento.hospitais;

        const medico = Array.isArray(agendamento.medicos)
          ? agendamento.medicos[0]
          : agendamento.medicos;

        const procedimento = Array.isArray(agendamento.tipos_cirurgia)
          ? agendamento.tipos_cirurgia[0]
          : agendamento.tipos_cirurgia;

        return {
          id: agendamento.id,

          // Identificação da solicitação
          codigo_solicitacao: agendamento.codigo_solicitacao,

          // Paciente
          paciente_nome: paciente?.nome ?? null,

          // Hospital
          hospital_nome: hospital
            ? [hospital.nome, hospital.unidade]
                .filter(Boolean)
                .join(" - ")
            : null,

          // Médico
          medico_nome: medico?.nome ?? null,

          // Procedimento cirúrgico
          procedimento_nome: procedimento?.nome_procedimento ?? null,
          procedimento_codigo: procedimento?.codigo_cirurgia ?? null,
          porte: procedimento?.porte ?? null,

          // Duração estimada
          tempo_medio_minutos:
            procedimento?.tempo_medio_minutos ?? null,

          tempo_p75_minutos:
            procedimento?.tempo_p75_minutos ?? null,

          tempo_p90_minutos:
            procedimento?.tempo_p90_minutos ?? null,

          // Status
          status_opme: agendamento.status_opme,
          status_equipamento: agendamento.status_equipamento,
          status_kanban: agendamento.status_kanban,

          // Data e horário
          data_agendamento: agendamento.data_agendamento,
          hora_inicio_planejada: agendamento.hora_inicio_planejada,

          // Confirmação
          cliente_confirmado_24h:
            agendamento.cliente_confirmado_24h
        };
      });

      return res.status(200).json({
        status: "success",
        agendamentos: resultado
      });

    } catch (error) {
      console.error("Erro inesperado no Dashboard:", error);

      return res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao carregar o Dashboard."
      });
    }
  }
);

export default router;