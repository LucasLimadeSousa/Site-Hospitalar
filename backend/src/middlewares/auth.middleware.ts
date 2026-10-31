
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Autenticação necessária."
    });
  }

  const token = authorization.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      status: "error",
      message: "Configuração de autenticação indisponível."
    });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: "nexus-core"
    });

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

    req.userId = decoded.sub;

    next();
  } catch {
    return res.status(401).json({
      status: "error",
      message: "Sessão inválida ou expirada."
    });
  }
}
