import type { Request, Response } from "express";
import { moderacaoReceitaSchema } from "../schemas/moderacao-receita.schema";
import { moderarReceita } from "../services/moderacao/receita.service";
import { sendResponse, successResponse } from "../utils/response";
import { validarEntrada } from "../utils/validation";

export async function moderacaoReceitaController(req: Request, res: Response): Promise<void> {
  const entrada = validarEntrada(moderacaoReceitaSchema, req.body);
  const decisao = await moderarReceita(entrada);
  sendResponse(res, successResponse(decisao, "Denúncia analisada com sucesso."));
}
