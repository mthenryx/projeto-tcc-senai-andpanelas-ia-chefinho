import { z } from "zod";

// Partes comuns às três denúncias
export const motivoSchema = z.string().trim().min(1).max(300);

// "detalhe" pode vir vazio ou nulo
export const detalheSchema = z
  .string()
  .trim()
  .max(2_000)
  .nullish()
  .transform((v) => v ?? "");

// Decisão devolvida ao backend (a exclusão em si é feita pelo backend)
export const decisaoModeracaoSchema = z.object({
  apagar: z.boolean().describe("true se o conteúdo deve ser apagado; false se deve ser mantido"),
});

export type DecisaoModeracao = z.infer<typeof decisaoModeracaoSchema>;
