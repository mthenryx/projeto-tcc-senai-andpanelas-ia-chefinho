import { z } from "zod";

export const mensagemHistoricoSchema = z.object({
  papel: z.enum(["user", "agente"]),
  mensagem: z.string().trim().min(1).max(10_000),
});

export const chatSchema = z.object({
  // O backend decide quais mensagens enviar (as mais recentes); o Chefinho só usa o que recebe
  historico_conversa: z.array(mensagemHistoricoSchema).default([]),
  pergunta_atual: z.string().trim().min(1).max(2_000),
});

export type ChatEntrada = z.infer<typeof chatSchema>;
export type MensagemHistorico = z.infer<typeof mensagemHistoricoSchema>;
