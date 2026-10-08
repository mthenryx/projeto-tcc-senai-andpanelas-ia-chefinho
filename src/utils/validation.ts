import { z } from "zod";
import { AppError } from "./errors";

function valorNoCaminho(dados: unknown, caminho: PropertyKey[]): unknown {
  let atual: any = dados;
  for (const parte of caminho) {
    if (atual === null || typeof atual !== "object") return undefined;
    atual = atual[parte as keyof typeof atual];
  }
  return atual;
}

// Valida o corpo da requisição e converte qualquer falha para o erro padrão da API
export function validarEntrada<T extends z.ZodType>(schema: T, dados: unknown): z.output<T> {
  const resultado = schema.safeParse(dados);
  if (resultado.success) return resultado.data;

  const problemas = resultado.error.issues.map((issue) => {
    const campo = issue.path.join(".") || "(corpo)";
    const ausente = valorNoCaminho(dados, issue.path) === undefined;
    return {
      campo,
      mensagem: ausente ? "campo obrigatório" : issue.message,
    };
  });

  const primeiro = problemas[0];
  const texto =
    primeiro.campo === "(corpo)"
      ? "O corpo da requisição deve ser um JSON com os campos esperados."
      : primeiro.mensagem === "campo obrigatório"
        ? `O campo '${primeiro.campo}' é obrigatório.`
        : `O campo '${primeiro.campo}' é inválido: ${primeiro.mensagem}.`;

  throw new AppError("INVALID_REQUEST", texto, problemas);
}
