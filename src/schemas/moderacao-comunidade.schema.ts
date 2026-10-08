import { z } from "zod";
import { detalheSchema, motivoSchema } from "./moderacao.schema";
import { urlMidiaSchema } from "./receita.schema";

export const moderacaoComunidadeSchema = z.object({
  motivo: motivoSchema,
  detalhe: detalheSchema,
  comunidade: z.object({
    nome: z.string().trim().min(1).max(300),
    descricao: z.string().max(10_000).nullish(),
    foto_url: urlMidiaSchema,
    banner_url: urlMidiaSchema,
    id_categoria_principal: z.union([z.string(), z.number()]).optional(),
  }),
});

export type ModeracaoComunidadeEntrada = z.infer<typeof moderacaoComunidadeSchema>;
