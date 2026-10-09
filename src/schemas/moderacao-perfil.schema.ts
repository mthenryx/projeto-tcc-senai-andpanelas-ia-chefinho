import { z } from "zod";

import { detalheSchema, motivoSchema } from "./moderacao.schema";

import { urlMidiaSchema } from "./receita.schema";

// Campos que NUNCA devem chegar ao Chefinho. Se chegarem, a requisição é recusada.
const CAMPOS_PROIBIDOS = ["senha", "password"];

export function camposProibidosEnviados(corpo: unknown): string[] {
  const dados = (corpo as { dados_usuario?: unknown } | null)?.dados_usuario;

  if (!dados || typeof dados !== "object") return [];

  return CAMPOS_PROIBIDOS.filter((campo) => campo in dados);
}

// Só o necessário para moderar.
// E-mail e data de nascimento não são enviados ao Gemini.
export const moderacaoPerfilSchema = z.object({
  motivo: motivoSchema,

  detalhe: detalheSchema,

  dados_usuario: z.object({
    nome: z.string().trim().min(1).max(300),

    username: z.string().trim().min(1).max(100),

    email: z.string().optional(),

    data_nascimento: z.string().optional(),

    foto_perfil: urlMidiaSchema,

    banner_url: urlMidiaSchema,
  }),
});

export type ModeracaoPerfilEntrada = z.infer<
  typeof moderacaoPerfilSchema
>;