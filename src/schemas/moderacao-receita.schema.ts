import { z } from "zod";
import { detalheSchema, motivoSchema } from "./moderacao.schema";
import { ingredienteSchema, passoPreparoSchema, urlMidiaSchema } from "./receita.schema";

const idOuTexto = z.union([z.string(), z.number()]).optional();

export const moderacaoReceitaSchema = z.object({
  motivo: motivoSchema,
  detalhe: detalheSchema,
  receita: z.object({
    titulo: z.string().trim().min(1).max(300),
    descricao: z.string().max(10_000).nullish(),
    foto: urlMidiaSchema,
    video: urlMidiaSchema,
    tempo: z.string().optional(),
    id_custo: idOuTexto,
    id_dificuldade: idOuTexto,
    id_porcao: idOuTexto,
    ingredientes: z.array(ingredienteSchema).default([]),
    modo_preparo: z.array(passoPreparoSchema).default([]),
    categorias: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

export type ModeracaoReceitaEntrada = z.infer<typeof moderacaoReceitaSchema>;
