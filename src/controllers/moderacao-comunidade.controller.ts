import type { Request, Response } from "express";
import { moderacaoComunidadeSchema } from "../schemas/moderacao-comunidade.schema";
import { moderarComunidade } from "../services/moderacao/comunidade.service";
import { sendResponse, successResponse } from "../utils/response";
import { validarEntrada } from "../utils/validation";

export async function moderacaoComunidadeController(req: Request, res: Response): Promise<void> {
  const entrada = validarEntrada(moderacaoComunidadeSchema, req.body);
  const decisao = await moderarComunidade(entrada);
  sendResponse(res, successResponse(decisao, "Denúncia analisada com sucesso."));
}
