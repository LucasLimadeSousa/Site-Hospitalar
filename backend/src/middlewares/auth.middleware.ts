
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  // Verifica se o cabeçalho possui o formato Bearer.
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Autenticação necessária."
    });
  }

  const token = authorization.slice(7);
  const secret = process.env.JWT_SECRET;

  // Verifica se a chave de assinatura está configurada.
  if (!secret) {
    console.error("JWT_SECRET não configurado.");

    return res.status(500).json({
      status: "error",
      message: "Configuração de autenticação indisponível."
    });
  }

  try {
    // Verifica assinatura, emissor e algoritmo do token.
    const decoded = jwt.verify(token, secret, {
      issuer: "nexus-core",
      algorithms: ["HS256"]
    });

    // Verifica se o token possui um identificador de usuário válido.
    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !decoded.sub
    ) {
      return res.status(401).json({
        status: "error",
        message: "Token inválido."
      });
    }

    // Disponibiliza o ID para os próximos middlewares e controllers.
    req.userId = decoded.sub;

    return next();

  } catch {
    return res.status(401).json({
      status: "error",
      message: "Sessão inválida ou expirada."
    });
  }
}
