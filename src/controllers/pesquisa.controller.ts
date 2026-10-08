import type { Request, Response } from "express";
import { pesquisaSchema } from "../schemas/pesquisa.schema";
import { pesquisarComIA } from "../services/pesquisa.service";
import { sendResponse, successResponse } from "../utils/response";
import { validarEntrada } from "../utils/validation";

export async function pesquisaController(req: Request, res: Response): Promise<void> {
  const entrada = validarEntrada(pesquisaSchema, req.body);
  const resposta = await pesquisarComIA(entrada);
  sendResponse(res, successResponse(resposta, "Pesquisa analisada com sucesso."));
}
