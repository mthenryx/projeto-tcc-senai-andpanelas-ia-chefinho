import type { Request, Response } from "express";
import { chatSchema } from "../schemas/chat.schema";
import { responderChat } from "../services/chat.service";
import { sendResponse, successResponse } from "../utils/response";
import { validarEntrada } from "../utils/validation";

export async function chatController(req: Request, res: Response): Promise<void> {
  const entrada = validarEntrada(chatSchema, req.body);
  const resposta = await responderChat(entrada);
  sendResponse(res, successResponse(resposta));
}
