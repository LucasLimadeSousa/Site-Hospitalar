
import { Router, type Response } from "express";

import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../middlewares/auth.middleware.js";

const router = Router();

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HORARIO_ABERTURA = 7 * 60;
const HORARIO_FECHAMENTO = 19 * 60;
const TURNO_MINUTOS = HORARIO_FECHAMENTO - HORARIO_ABERTURA;
const TURNO_OVER_MINUTOS = 20;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function converterHoraParaMinutos(hora: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(hora);

  if (!match) return null;

  const horas = Number(match[1]);
  const minutos = Number(match[2]);

  if (horas > 23 || minutos > 59) return null;

  return horas * 60 + minutos;
}

function converterMinutosParaHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}:00`;
}

function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;

  const ano = Number(data.slice(0, 4));
  const mes = Number(data.slice(5, 7));
  const dia = Number(data.slice(8, 10));

  const date = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    date.getUTCFullYear() === ano &&
    date.getUTCMonth() === mes - 1 &&
    date.getUTCDate() === dia
  );
}

function dataEhDiaUtil(data: string): boolean {
  const ano = Number(data.slice(0, 4));
  const mes = Number(data.slice(5, 7));
  const dia = Number(data.slice(8, 10));

  const diaSemana = new Date(
    Date.UTC(ano, mes - 1, dia)
  ).getUTCDay();

  return diaSemana >= 1 && diaSemana <= 5;
}

function recursosLiberados(
  statusOpme: string,
  statusEquipamento: string
): boolean {
  const statusPermitidos = ["liberado", "nao_aplicavel"];

  return (
    statusPermitidos.includes(statusOpme) &&
    statusPermitidos.includes(statusEquipamento)
  );
}

async function buscarCirurgia(agendamentoId: string) {
  return supabase
    .from("agendamentos")
    .select(`
      id,
      codigo_solicitacao,
      hospital_id,
      sala_id,
      status_opme,
      status_equipamento,
      status_kanban,
      tipos_cirurgia (
        tempo_p75_minutos,
        tempo_p90_minutos
      )
    `)
    .eq("id", agendamentoId)
    .maybeSingle();
}

async function buscarSalas(hospitalId: string) {
  return supabase
    .from("salas")
    .select("id, numero, bloco, andar, status_atual")
    .eq("hospital_id", hospitalId)
    .eq("ativo", true)
    .eq("status_atual", "livre")
    .order("numero", { ascending: true });
}

async function buscarReservas(hospitalId: string, data: string) {
  return supabase
    .from("agendamentos")
    .select(`
      id,
      codigo_solicitacao,
      sala_id,
      hora_inicio_planejada,
      hora_fim_estimada_p90,
      tipos_cirurgia (
        tempo_p90_minutos
      )
    `)
    .eq("hospital_id", hospitalId)
    .eq("data_agendamento", data)
    .eq("status_kanban", "agendada")
    .not("sala_id", "is", null)
    .order("hora_inicio_planejada", { ascending: true });
}

type Reserva = {
  id: string;
  codigo_solicitacao: string;
  sala_id: string;
  hora_inicio_planejada: string;
  hora_fim_estimada_p90: string | null;
  tipos_cirurgia:
    | { tempo_p90_minutos: number | null }
    | { tempo_p90_minutos: number | null }[]
    | null;
};

function calcularFimReserva(reserva: Reserva): number | null {
  const inicio = converterHoraParaMinutos(
    reserva.hora_inicio_planejada
  );

  if (inicio === null) return null;

  if (reserva.hora_fim_estimada_p90) {
    const fim = converterHoraParaMinutos(
      reserva.hora_fim_estimada_p90
    );

    if (fim !== null) {
      return fim + TURNO_OVER_MINUTOS;
    }
  }

  const procedimento = firstRelation(reserva.tipos_cirurgia);
  const p90 = procedimento?.tempo_p90_minutos;

  if (p90 === null || p90 === undefined) return null;

  return inicio + p90 + TURNO_OVER_MINUTOS;
}

function encontrarHorarioDisponivel(
  reservas: Reserva[],
  duracaoTotal: number,
  limiteOcupacao: number
): number | null {
  if (duracaoTotal > limiteOcupacao) return null;

  const reservasOrdenadas = reservas
    .map(reserva => {
      const inicio = converterHoraParaMinutos(
        reserva.hora_inicio_planejada
      );

      const fim = calcularFimReserva(reserva);

      return { inicio, fim };
    })
    .filter(
      reserva =>
        reserva.inicio !== null &&
        reserva.fim !== null &&
        reserva.inicio < reserva.fim
    )
    .sort((a, b) => a.inicio! - b.inicio!);

  let horarioCandidato = HORARIO_ABERTURA;

  for (const reserva of reservasOrdenadas) {
    const inicio = reserva.inicio!;
    const fim = reserva.fim!;

    if (fim <= horarioCandidato) continue;

    if (horarioCandidato + duracaoTotal <= inicio) {
      return horarioCandidato;
    }

    horarioCandidato = Math.max(horarioCandidato, fim);

    if (
      horarioCandidato + duracaoTotal >
      HORARIO_FECHAMENTO
    ) {
      return null;
    }
  }

  if (
    horarioCandidato + duracaoTotal <=
    HORARIO_FECHAMENTO
  ) {
    return horarioCandidato;
  }

  return null;
}

async function gerarOpcoesDistribuicao(
  hospitalId: string,
  data: string,
  p90: number,
  ocupacaoMaxima: number
) {
  const { data: salas, error: salasError } =
    await buscarSalas(hospitalId);

  if (salasError) {
    throw new Error("Não foi possível consultar as salas.");
  }

  const { data: reservas, error: reservasError } =
    await buscarReservas(hospitalId, data);

  if (reservasError) {
    throw new Error(
      "Não foi possível consultar os agendamentos existentes."
    );
  }

  const duracaoTotal = p90 + TURNO_OVER_MINUTOS;
  const limiteOcupacao =
    TURNO_MINUTOS * (ocupacaoMaxima / 100);

  const opcoes = (salas ?? [])
    .map(sala => {
      const reservasSala = (reservas ?? []).filter(
        reserva => reserva.sala_id === sala.id
      ) as Reserva[];

      const horario = encontrarHorarioDisponivel(
        reservasSala,
        duracaoTotal,
        limiteOcupacao
      );

      if (horario === null) return null;

      const ocupacaoAtual = reservasSala.reduce(
        (total, reserva) => {
          const inicio = converterHoraParaMinutos(
            reserva.hora_inicio_planejada
          );

          const fim = calcularFimReserva(reserva);

          if (inicio === null || fim === null) {
            return total;
          }

          return total + (fim - inicio);
        },
        0
      );

      const ocupacaoFinal =
        ((ocupacaoAtual + duracaoTotal) / TURNO_MINUTOS) *
        100;

      return {
        sala_id: sala.id,
        sala_numero: sala.numero,
        bloco: sala.bloco,
        andar: sala.andar,
        hora_inicio: converterMinutosParaHora(horario),
        hora_fim_cirurgia: converterMinutosParaHora(
          horario + p90
        ),
        hora_fim_com_turnover: converterMinutosParaHora(
          horario + duracaoTotal
        ),
        duracao_p90_minutos: p90,
        turnover_minutos: TURNO_OVER_MINUTOS,
        duracao_total_minutos: duracaoTotal,
        ocupacao_final_percentual: Number(
          ocupacaoFinal.toFixed(2)
        )
      };
    })
    .filter(opcao => opcao !== null)
    .sort((a, b) => {
      const horaA = converterHoraParaMinutos(
        a!.hora_inicio
      )!;

      const horaB = converterHoraParaMinutos(
        b!.hora_inicio
      )!;

      if (horaA !== horaB) return horaA - horaB;

      return String(a!.sala_numero).localeCompare(
        String(b!.sala_numero),
        undefined,
        { numeric: true }
      );
    });

  return {
    duracaoTotal,
    opcoes
  };
}

// LISTAR HOSPITAIS
router.get(
  "/hospitais",
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("hospitais")
        .select("id, nome, unidade")
        .order("nome", { ascending: true });

      if (error) {
        console.error(
          "Erro ao listar hospitais:",
          error.message
        );

        return res.status(500).json({
          status: "error",
          message: "Não foi possível carregar os hospitais."
        });
      }

      return res.status(200).json({
        status: "success",
        total: data?.length ?? 0,
        hospitais: data ?? []
      });
    } catch (error) {
      console.error(
        "Erro inesperado ao listar hospitais:",
        error
      );

      return res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao carregar os hospitais."
      });
    }
  }
);

// LISTAR SALAS DE UM HOSPITAL
router.get(
  "/salas/:hospitalId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.params.hospitalId
        ?.toString()
        .trim();

      if (!hospitalId || !uuidRegex.test(hospitalId)) {
        return res.status(400).json({
          status: "error",
          message: "O identificador do hospital é inválido."
        });
      }

      const { data: hospital, error: hospitalError } =
        await supabase
          .from("hospitais")
          .select("id, nome, unidade")
          .eq("id", hospitalId)
          .maybeSingle();

      if (hospitalError) {
        console.error(
          "Erro ao consultar hospital:",
          hospitalError.message
        );

        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar o hospital."
        });
      }

      if (!hospital) {
        return res.status(404).json({
          status: "error",
          message: "Hospital não encontrado."
        });
      }

      const { data: salas, error: salasError } =
        await supabase
          .from("salas")
          .select(`
            id,
            numero,
            bloco,
            andar,
            tempo_turnover_minutos,
            status_atual
          `)
          .eq("hospital_id", hospitalId)
          .eq("ativo", true)
          .order("numero", { ascending: true });

      if (salasError) {
        console.error(
          "Erro ao listar salas:",
          salasError.message
        );

        return res.status(500).json({
          status: "error",
          message: "Não foi possível carregar as salas."
        });
      }

      return res.status(200).json({
        status: "success",
        hospital,
        total: salas?.length ?? 0,
        salas: salas ?? []
      });
    } catch (error) {
      console.error(
        "Erro inesperado ao listar salas:",
        error
      );

      return res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao carregar as salas."
      });
    }
  }
);

// LISTAR AGENDAMENTOS DE UM HOSPITAL EM UMA DATA
router.get(
  "/agendamentos/:hospitalId/:data",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.params.hospitalId
        ?.toString()
        .trim();

      const data = req.params.data?.toString().trim();

      if (!hospitalId || !uuidRegex.test(hospitalId)) {
        return res.status(400).json({
          status: "error",
          message: "O identificador do hospital é inválido."
        });
      }

      if (!data || !dataValida(data)) {
        return res.status(400).json({
          status: "error",
          message: "Informe uma data válida no formato YYYY-MM-DD."
        });
      }

      const { data: agendamentos, error } =
        await supabase
          .from("agendamentos")
          .select(`
            id,
            codigo_solicitacao,
            sala_id,
            data_agendamento,
            hora_inicio_planejada,
            hora_fim_estimada_p90,
            tipos_cirurgia (
              tempo_p90_minutos
            )
          `)
          .eq("hospital_id", hospitalId)
          .eq("data_agendamento", data)
          .eq("status_kanban", "agendada")
          .not("sala_id", "is", null)
          .order("hora_inicio_planejada", {
            ascending: true
          });

      if (error) {
        console.error(
          "Erro ao consultar agendamentos:",
          error.message
        );

        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar os agendamentos."
        });
      }

      const resultado = (agendamentos ?? []).map(item => {
        const procedimento = firstRelation(
          item.tipos_cirurgia
        );

        return {
          id: item.id,
          codigo_solicitacao: item.codigo_solicitacao,
          sala_id: item.sala_id,
          data_agendamento: item.data_agendamento,
          hora_inicio_planejada: item.hora_inicio_planejada,
          hora_fim_estimada_p90:
            item.hora_fim_estimada_p90,
          tempo_p90_minutos:
            procedimento?.tempo_p90_minutos ?? null
        };
      });

      return res.status(200).json({
        status: "success",
        data,
        total: resultado.length,
        agendamentos: resultado
      });
    } catch (error) {
      console.error(
        "Erro inesperado ao consultar agendamentos:",
        error
      );

      return res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao consultar os agendamentos."
      });
    }
  }
);

// VALIDAR E DISTRIBUIR UMA CIRURGIA
router.post(
  "/validar",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        agendamento_id,
        hospital_id,
        data,
        ocupacao_maxima
      } = req.body;

      if (
        typeof agendamento_id !== "string" ||
        !uuidRegex.test(agendamento_id) ||
        typeof hospital_id !== "string" ||
        !uuidRegex.test(hospital_id)
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Informe identificadores válidos para a cirurgia e o hospital."
        });
      }

      if (
        typeof data !== "string" ||
        !dataValida(data)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Informe uma data válida no formato YYYY-MM-DD."
        });
      }

      if (!dataEhDiaUtil(data)) {
        return res.status(400).json({
          status: "error",
          message:
            "A distribuição de cirurgias eletivas está disponível de segunda a sexta-feira."
        });
      }

      if (
        typeof ocupacao_maxima !== "number" ||
        ocupacao_maxima < 1 ||
        ocupacao_maxima > 100
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "A meta de ocupação deve estar entre 1% e 100%."
        });
      }

      const { data: cirurgia, error: cirurgiaError } =
        await buscarCirurgia(agendamento_id);

      if (cirurgiaError) {
        console.error(
          "Erro ao consultar cirurgia:",
          cirurgiaError.message
        );

        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar a cirurgia."
        });
      }

      if (!cirurgia) {
        return res.status(404).json({
          status: "error",
          message: "Cirurgia não encontrada."
        });
      }

      if (
        cirurgia.status_kanban === "agendada" ||
        cirurgia.status_kanban === "agendamento_realizado" ||
        cirurgia.status_kanban === "cancelada"
      ) {
        return res.status(409).json({
          status: "error",
          message:
            "Esta cirurgia não está disponível para uma nova distribuição."
        });
      }

      if (
        !recursosLiberados(
          cirurgia.status_opme,
          cirurgia.status_equipamento
        )
      ) {
        return res.status(409).json({
          status: "error",
          message:
            "PENDÊNCIA IDENTIFICADA: existem pendências de OPME ou equipamentos.",
          pendencias: {
            opme: cirurgia.status_opme,
            equipamento: cirurgia.status_equipamento
          }
        });
      }

      const procedimento = firstRelation(
        cirurgia.tipos_cirurgia
      );

      const p90 = procedimento?.tempo_p90_minutos;
      const p75 = procedimento?.tempo_p75_minutos;

      if (typeof p90 !== "number" || p90 <= 0) {
        return res.status(422).json({
          status: "error",
          message:
            "O tempo P90 da cirurgia não está cadastrado corretamente."
        });
      }

      const { data: hospital, error: hospitalError } =
        await supabase
          .from("hospitais")
          .select("id, nome, unidade")
          .eq("id", hospital_id)
          .maybeSingle();

      if (hospitalError) {
        return res.status(500).json({
          status: "error",
          message: "Não foi possível consultar o hospital."
        });
      }

      if (!hospital) {
        return res.status(404).json({
          status: "error",
          message: "Hospital não encontrado."
        });
      }

      // Sincroniza o Kanban quando os recursos estão liberados.
      if (
        cirurgia.status_kanban === "aguardando_liberacao"
      ) {
        const { error: sincronizacaoError } =
          await supabase
            .from("agendamentos")
            .update({
              status_kanban: "pronta_para_agendamento"
            })
            .eq("id", agendamento_id)
            .eq("status_kanban", "aguardando_liberacao");

        if (sincronizacaoError) {
          console.error(
            "Erro ao sincronizar Kanban:",
            sincronizacaoError.message
          );

          return res.status(500).json({
            status: "error",
            message:
              "Não foi possível atualizar o status da cirurgia."
          });
        }
      }

      const { duracaoTotal, opcoes } =
        await gerarOpcoesDistribuicao(
          hospital_id,
          data,
          p90,
          ocupacao_maxima
        );

      if (opcoes.length === 0) {
        return res.status(409).json({
          status: "error",
          message:
            "Não foi encontrada uma sala disponível para essa data e meta de ocupação.",
          sugestao:
            "Escolha outra data ou aumente a meta de ocupação.",
          calculo: {
            p90_minutos: p90,
            turnover_minutos: TURNO_OVER_MINUTOS,
            duracao_total_minutos: duracaoTotal,
            ocupacao_maxima_percentual: ocupacao_maxima
          }
        });
      }

      return res.status(200).json({
        status: "success",
        message:
          "Distribuição validada. Escolha uma das salas disponíveis.",
        cirurgia: {
          id: cirurgia.id,
          codigo_solicitacao: cirurgia.codigo_solicitacao,
          p75_minutos: p75,
          p90_minutos: p90
        },
        hospital,
        data,
        ocupacao_maxima_percentual: ocupacao_maxima,
        calculo: {
          p90_minutos: p90,
          turnover_minutos: TURNO_OVER_MINUTOS,
          duracao_total_minutos: duracaoTotal
        },
        total_opcoes: opcoes.length,
        opcoes
      });
    } catch (error) {
      console.error(
        "Erro inesperado ao validar distribuição:",
        error
      );

      return res.status(500).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao validar a distribuição."
      });
    }
  }
);

// CONFIRMAR E SALVAR A RESERVA
router.post(
  "/confirmar",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        agendamento_id,
        hospital_id,
        sala_id,
        data,
        hora_inicio_planejada,
        ocupacao_maxima
      } = req.body;

      if (
        typeof agendamento_id !== "string" ||
        !uuidRegex.test(agendamento_id) ||
        typeof hospital_id !== "string" ||
        !uuidRegex.test(hospital_id) ||
        typeof sala_id !== "string" ||
        !uuidRegex.test(sala_id)
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Informe identificadores válidos para a cirurgia, hospital e sala."
        });
      }

      if (
        typeof data !== "string" ||
        !dataValida(data)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Informe uma data válida no formato YYYY-MM-DD."
        });
      }

      if (!dataEhDiaUtil(data)) {
        return res.status(400).json({
          status: "error",
          message:
            "A distribuição de cirurgias eletivas está disponível de segunda a sexta-feira."
        });
      }

      if (
        typeof ocupacao_maxima !== "number" ||
        ocupacao_maxima < 1 ||
        ocupacao_maxima > 100
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "A meta de ocupação deve estar entre 1% e 100%."
        });
      }

      if (typeof hora_inicio_planejada !== "string") {
        return res.status(400).json({
          status: "error",
          message: "Informe um horário de início válido."
        });
      }

      const horarioEscolhido =
        converterHoraParaMinutos(hora_inicio_planejada);

      if (horarioEscolhido === null) {
        return res.status(400).json({
          status: "error",
          message: "Informe um horário de início válido."
        });
      }

      const { data: cirurgia, error: cirurgiaError } =
        await buscarCirurgia(agendamento_id);

      if (cirurgiaError || !cirurgia) {
        return res.status(cirurgiaError ? 500 : 404).json({
          status: "error",
          message: cirurgiaError
            ? "Não foi possível consultar a cirurgia."
            : "Cirurgia não encontrada."
        });
      }

      if (
        cirurgia.status_kanban !== "pronta_para_agendamento"
      ) {
        return res.status(409).json({
          status: "error",
          message:
            "A cirurgia não está pronta para agendamento ou já foi distribuída."
        });
      }

      if (
        !recursosLiberados(
          cirurgia.status_opme,
          cirurgia.status_equipamento
        )
      ) {
        return res.status(409).json({
          status: "error",
          message:
            "PENDÊNCIA IDENTIFICADA: existem pendências de OPME ou equipamentos."
        });
      }

      const procedimento = firstRelation(
        cirurgia.tipos_cirurgia
      );

      const p90 = procedimento?.tempo_p90_minutos;
      const p75 = procedimento?.tempo_p75_minutos;

      if (typeof p90 !== "number" || p90 <= 0) {
        return res.status(422).json({
          status: "error",
          message:
            "O tempo P90 da cirurgia não está cadastrado corretamente."
        });
      }

      const { data: sala, error: salaError } =
        await supabase
          .from("salas")
          .select("id, numero, bloco, andar")
          .eq("id", sala_id)
          .eq("hospital_id", hospital_id)
          .eq("ativo", true)
          .eq("status_atual", "livre")
          .maybeSingle();

      if (salaError || !sala) {
        return res.status(salaError ? 500 : 404).json({
          status: "error",
          message: salaError
            ? "Não foi possível consultar a sala."
            : "Sala indisponível ou não encontrada neste hospital."
        });
      }

      const { duracaoTotal, opcoes } =
        await gerarOpcoesDistribuicao(
          hospital_id,
          data,
          p90,
          ocupacao_maxima
        );

      const opcaoEscolhida = opcoes.find(
        opcao =>
          opcao?.sala_id === sala_id &&
          converterHoraParaMinutos(
            opcao.hora_inicio
          ) === horarioEscolhido
      );

      if (!opcaoEscolhida) {
        return res.status(409).json({
          status: "error",
          message:
            "O horário escolhido não está mais disponível. Faça uma nova validação.",
          sugestao:
            "Atualize as opções de distribuição."
        });
      }

      const fimP75 =
        typeof p75 === "number"
          ? converterMinutosParaHora(
              horarioEscolhido + p75
            )
          : null;

      const fimP90 = converterMinutosParaHora(
        horarioEscolhido + p90
      );

      const { data: atualizado, error: updateError } =
        await supabase
          .from("agendamentos")
          .update({
            hospital_id,
            sala_id,
            data_agendamento: data,
            hora_inicio_planejada:
              converterMinutosParaHora(horarioEscolhido),
            hora_fim_estimada_p75: fimP75,
            hora_fim_estimada_p90: fimP90,
            status_kanban: "agendada"
          })
          .eq("id", agendamento_id)
          .eq("status_kanban", "pronta_para_agendamento")
          .select(`
            id,
            codigo_solicitacao,
            hospital_id,
            sala_id,
            data_agendamento,
            hora_inicio_planejada,
            hora_fim_estimada_p75,
            hora_fim_estimada_p90,
            status_kanban
          `)
          .maybeSingle();

      if (updateError) {
        console.error(
          "Erro ao salvar distribuição:",
          updateError.message
        );

        return res.status(500).json({
          status: "error",
          message: "Não foi possível salvar o agendamento."
        });
      }

      if (!atualizado) {
        return res.status(409).json({
          status: "error",
          message:
            "A cirurgia foi alterada por outra operação. Atualize os dados e tente novamente."
        });
      }

      return res.status(200).json({
        status: "success",
        message:
          "Cirurgia distribuída e agendada com sucesso.",
        agendamento: atualizado,
        sala,
        calculo: {
          p90_minutos: p90,
          turnover_minutos: TURNO_OVER_MINUTOS,
          duracao_total_minutos: duracaoTotal
        }
      });
    } catch (error) {
      console.error(
        "Erro inesperado ao confirmar distribuição:",
        error
      );

      return res.status(500).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao confirmar a distribuição."
      });
    }
  }
);

export default router;
