import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { errorResponse, sendResponse } from "../utils/response";

export function rotaNaoEncontrada(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("NOT_FOUND", "A rota solicitada não existe."));
}

// Último middleware: toda falha vira o envelope padrão. Stack trace só vai para o log.
export function tratarErros(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendResponse(res, errorResponse(err));
    return;
  }

  const tipo = (err as { type?: string }).type;
  if (tipo === "entity.parse.failed") {
    sendResponse(res, errorResponse(new AppError("INVALID_REQUEST", "O corpo da requisição não é um JSON válido.")));
    return;
  }
  if (tipo === "entity.too.large") {
    sendResponse(
      res,
      errorResponse(new AppError("INVALID_REQUEST", "O corpo da requisição excede o tamanho máximo permitido.", null, 413))
    );
    return;
  }

  console.error("[erro]", err instanceof Error ? err.stack : err);
  sendResponse(res, errorResponse(new AppError("INTERNAL_ERROR", "Ocorreu um erro inesperado.")));
}
