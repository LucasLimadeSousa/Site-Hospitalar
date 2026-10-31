
import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";
import { authenticateToken, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Muitas tentativas. Aguarde alguns minutos."
  }
});

router.post(
  "/login",
  loginLimiter,
  async (req: Request, res: Response) => {
    try {
      const { credential, password } = req.body ?? {};

      if (
        typeof credential !== "string" ||
        typeof password !== "string" ||
        !credential.trim() ||
        !password ||
        credential.length > 50 ||
        password.length > 128
      ) {
        return res.status(400).json({
          status: "error",
          message: "Informe uma matrícula e uma senha válidas."
        });
      }

      const { data: usuario, error } = await supabase
        .from("usuario_core")
        .select("id, nome, credencial, senha")
        .eq("credencial", credential.trim())
        .maybeSingle();

      if (error) {
        console.error("Erro ao consultar usuário:", error.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível realizar o login."
        });
      }

      if (!usuario) {
        return res.status(401).json({
          status: "error",
          message: "Matrícula ou senha incorretos."
        });
      }

      const senhaValida = await bcrypt.compare(
        password,
        usuario.senha
      );

      if (!senhaValida) {
        return res.status(401).json({
          status: "error",
          message: "Matrícula ou senha incorretos."
        });
      }

      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        throw new Error("JWT_SECRET não configurado.");
      }

      const token = jwt.sign(
        {},
        jwtSecret,
        {
          subject: String(usuario.id),
          issuer: "nexus-core",
          expiresIn: "2h"
        }
      );

      return res.status(200).json({
        status: "success",
        message: "Login realizado com sucesso!",
        token,
        user: {
          id: usuario.id,
          nome: usuario.nome,
          credential: usuario.credencial
        }
      });

    } catch (error) {
      console.error("Erro durante a autenticação:", error);

      return res.status(500).json({
        status: "error",
        message: "Erro interno do servidor."
      });
    }
  }
);


router.get(
  "/me",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { data: usuario, error } = await supabase
        .from("usuario_core")
        .select("id, nome, credencial")
        .eq("id", req.userId!)
        .maybeSingle();

      if (error) {
        console.error("Erro ao consultar sessão:", error.message);

        return res.status(500).json({
          status: "error",
          message: "Não foi possível verificar a sessão."
        });
      }

      if (!usuario) {
        return res.status(401).json({
          status: "error",
          message: "Usuário não encontrado ou desativado."
        });
      }

      return res.status(200).json({
        status: "success",
        user: {
          id: usuario.id,
          nome: usuario.nome,
          credential: usuario.credencial
        }
      });
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);

      return res.status(500).json({
        status: "error",
        message: "Erro interno do servidor."
      });
    }
  }
);



export default router;
