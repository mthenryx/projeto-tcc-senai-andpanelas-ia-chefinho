import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

// Se CHEFINHO_API_KEY estiver definida, o backend precisa enviar o header "x-api-key".
// Sem a variável, a autenticação fica desligada (útil em desenvolvimento).
export function autenticar(req: Request, _res: Response, next: NextFunction): void {
  if (!env.apiKey) return next();

  const enviada = Buffer.from(req.header("x-api-key") ?? "");
  const esperada = Buffer.from(env.apiKey);
  const valida = enviada.length === esperada.length && timingSafeEqual(enviada, esperada);

  if (!valida) throw new AppError("UNAUTHORIZED", "API key ausente ou inválida.");
  next();
}
