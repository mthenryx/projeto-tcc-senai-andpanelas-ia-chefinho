import type { Response } from "express";
import { AGENT } from "../config/env";
import { AppError, ERROR_DEFAULTS, ErrorCode } from "./errors";

export interface RespostaPadrao<T = unknown> {
  status_code: number;
  success: boolean;
  agent: { name: string; version: string };
  message: string;
  response_ia: T | null;
  error: { code: ErrorCode; message: string; details: unknown } | null;
}

export function successResponse<T>(
  responseIa: T,
  message = "Operação realizada com sucesso.",
  statusCode = 200
): RespostaPadrao<T> {
  return {
    status_code: statusCode,
    success: true,
    agent: { ...AGENT },
    message,
    response_ia: responseIa,
    error: null,
  };
}

export function errorResponse(erro: AppError): RespostaPadrao<null> {
  return {
    status_code: erro.statusCode,
    success: false,
    agent: { ...AGENT },
    message: ERROR_DEFAULTS[erro.code].message,
    response_ia: null,
    error: { code: erro.code, message: erro.message, details: erro.details ?? null },
  };
}

export function sendResponse(res: Response, corpo: RespostaPadrao): void {
  res.status(corpo.status_code).json(corpo);
}
