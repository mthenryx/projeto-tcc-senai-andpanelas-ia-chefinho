import { z } from "zod";

// Peças de receita compartilhadas entre a moderação e a pesquisa.
// Quando o contrato oficial de receita do Entre Panelas for fechado, ajuste aqui.

export const ingredienteSchema = z.object({
  nome: z.string().trim().min(1),
  quantidade: z.union([z.string(), z.number()]).transform(String),
  id_unidade_medida: z.union([z.string(), z.number()]).transform(String),
});

// Versão estrita, usada no schema que o Gemini preenche (só tipos simples)
export const ingredienteIASchema = z.object({
  nome: z.string().min(1),
  quantidade: z.string().describe("Quantidade, ex.: 600"),
  id_unidade_medida: z.string().describe("Unidade de medida, ex.: g, ml, un, xícara"),
});

export const passoPreparoSchema = z.object({
  metodo_preparo: z.string().trim().min(1),
  ordem_preparo: z.number().int(),
});

export const passoPreparoIASchema = z.object({
  metodo_preparo: z.string().min(1),
  ordem_preparo: z.number().describe("Posição do passo, começando em 1"),
});

// URL de mídia: aceita só http/https; string vazia ou null significam "sem mídia"
export const urlMidiaSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.url({ protocol: /^https?$/ }).nullish()
) as z.ZodType<string | null | undefined>;

// Tamanhos máximos dos campos no banco de dados (em caracteres), conforme o modelo de dados.
export const LIMITES_RECEITA = {
  titulo: 50, // tbl_receita.titulo VARCHAR(50)
  descricao: 200, // tbl_receita.descricao VARCHAR(200)
  foto: 2048, // tbl_receita.foto VARCHAR(2048)
  video: 2083, // tbl_receita.video VARCHAR(2083)
  custo: 20, // tbl_custo.tipo_custo VARCHAR(20)
  dificuldade: 30, // tbl_dificuldade.dificuldade VARCHAR(30)
  metodoPreparo: 250, // tbl_modo_preparo.metodo_preparo VARCHAR(250)
} as const;

// Tempo no formato TIME do banco (HH:MM:SS)
export const REGEX_TEMPO = /^\d{2}:\d{2}:\d{2}$/;
