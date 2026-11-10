import { z } from "zod";
import { ingredienteIASchema, LIMITES_RECEITA, passoPreparoIASchema, REGEX_TEMPO } from "./receita.schema";

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
  titulo: z.string().min(1).describe("Nome comum e curto do prato em português, como é buscado em sites de receita (ex.: \"Feijoada\"), sem nomes criativos"),
  titulo_ingles: z.string().min(1).describe("Termo de busca em inglês para achar a foto no Unsplash: 1 a 3 palavras genéricas, como um fotógrafo marcaria a foto (ex.: \"Chicken stroganoff\"). Nunca é exibido ao usuário"),
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

// A foto é sempre uma URL válida (o Chefinho não sugere receita sem foto); o vídeo é opcional.
// Os limites são os do banco: a receita só é devolvida se couber em todas as colunas.
export const receitaGeradaSchema = receitaIASchema.omit({ titulo_ingles: true }).extend({
  titulo: z.string().min(1).max(LIMITES_RECEITA.titulo),
  descricao: z.string().min(1).max(LIMITES_RECEITA.descricao),
  custo: z.string().max(LIMITES_RECEITA.custo),
  dificuldade: z.string().max(LIMITES_RECEITA.dificuldade),
  tempo: z.string().regex(REGEX_TEMPO),
  modo_preparo: z.array(
    passoPreparoIASchema.extend({
      metodo_preparo: z.string().min(1).max(LIMITES_RECEITA.metodoPreparo),
    })
  ).min(1),
  foto: z.url().max(LIMITES_RECEITA.foto),
  video: z.string().max(LIMITES_RECEITA.video).nullable(),
});

export type ReceitaGerada = z.infer<typeof receitaGeradaSchema>;
export type RespostaPesquisa = { possui_sugestao: boolean; receita: ReceitaGerada | null };
