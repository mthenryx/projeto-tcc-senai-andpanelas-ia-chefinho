import { z } from "zod";
import { ingredienteIASchema, passoPreparoIASchema } from "./receita.schema";

// ---- Entrada: o backend faz a busca no banco e envia o resultado ----

const receitaEncontradaSchema = z.object({
  titulo: z.string(),
  descricao: z.string().nullish(),
  foto: z.string().nullish(),
  video: z.string().nullish(),
  tempo: z.string().nullish(),
  custo: z.string().nullish(),
  dificuldade: z.string().nullish(),
  porcao: z.union([z.string(), z.number()]).nullish(),
});

export const pesquisaSchema = z.object({
  pesquisa_usuario: z.string().trim().min(1).max(200),
  encontrados_db: z.array(receitaEncontradaSchema).default([]),
});

export type PesquisaEntrada = z.infer<typeof pesquisaSchema>;

// ---- Saída da IA: receita completa (sem foto/vídeo, que vêm das tools) ----
// Os campos seguem a receita usada pelo backend (exemplos de moderação e de busca).
// Ajuste quando o contrato oficial de receita for definido.

export const receitaIASchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().min(1),
  tempo: z.string().describe("Tempo total de preparo no formato HH:MM:SS, ex.: 00:40:00"),
  custo: z.string().describe("Custo da receita, no mesmo estilo das receitas encontradas"),
  dificuldade: z.string().describe("Dificuldade da receita, no mesmo estilo das receitas encontradas"),
  porcao: z.number().min(1).describe("Quantidade de porções (número inteiro)"),
  ingredientes: z.array(ingredienteIASchema).min(1),
  modo_preparo: z.array(passoPreparoIASchema).min(1),
  categorias: z.array(z.string()),
  tags: z.array(z.string()),
});

export const pesquisaIASchema = z.object({
  tem_sugestao: z.boolean().describe("true somente se há uma receita nova e relevante para sugerir"),
  receita: receitaIASchema.optional().describe("Obrigatória quando tem_sugestao é true"),
});

// ---- Saída da API (response_ia) ----

export const receitaGeradaSchema = receitaIASchema.extend({
  foto: z.string().nullable(),
  video: z.string().nullable(),
});

export type ReceitaGerada = z.infer<typeof receitaGeradaSchema>;
export type RespostaPesquisa = { possui_sugestao: boolean; receita: ReceitaGerada | null };
