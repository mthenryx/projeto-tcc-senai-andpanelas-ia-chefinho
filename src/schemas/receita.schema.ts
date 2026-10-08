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
