import type { Request, Response } from "express";
import {
  camposProibidosEnviados,
  moderacaoPerfilSchema,
} from "../schemas/moderacao-perfil.schema";
import { moderarPerfil } from "../services/moderacao/perfil.service";
import { AppError } from "../utils/errors";
import { sendResponse, successResponse } from "../utils/response";
import { validarEntrada } from "../utils/validation";

export async function moderacaoPerfilController(req: Request, res: Response): Promise<void> {
  // Senha nunca deve chegar ao Chefinho: recusa a requisição (sem repetir o valor recebido)
  const proibidos = camposProibidosEnviados(req.body);
  if (proibidos.length > 0) {
    throw new AppError(
      "INVALID_REQUEST",
      `O campo '${proibidos[0]}' não deve ser enviado ao Chefinho. Remova-o da requisição.`,
      proibidos.map((campo) => ({ campo: `dados_usuario.${campo}`, mensagem: "campo não permitido" }))
    );
  }

  const entrada = validarEntrada(moderacaoPerfilSchema, req.body);
  const decisao = await moderarPerfil(entrada);
  sendResponse(res, successResponse(decisao, "Denúncia analisada com sucesso."));
}
