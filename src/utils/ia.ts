import { env } from "../config/env";
import { AppError } from "./errors";

// O content da resposta pode vir como texto ou como lista de blocos
export function extrairTexto(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((bloco) =>
        typeof bloco === "string" ? bloco : ((bloco as { text?: string }).text ?? "")
      )
      .join("");
  }
  return "";
}

export function sinalDeTimeout(): AbortSignal {
  return AbortSignal.timeout(env.aiTimeoutMs);
}

function converterErroIA(err: unknown): AppError | null {
  if (err instanceof AppError) return err;

  const e = err as { name?: string; message?: string; status?: number };
  const nome = e?.name ?? "";
  const mensagem = e?.message ?? "";

  if (nome === "TimeoutError" || nome === "AbortError" || /timed? ?out/i.test(mensagem)) {
    return new AppError("AI_TIMEOUT", "O Google Gemini não respondeu dentro do tempo limite.");
  }
  if (typeof e?.status === "number" || /fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT/i.test(mensagem)) {
    return new AppError("AI_SERVICE_UNAVAILABLE", "Não foi possível obter uma resposta do Google Gemini.");
  }
  if (/OutputParser|ZodError|EmptyContent|JSON/i.test(nome + " " + mensagem)) {
    return new AppError("AI_RESPONSE_INVALID", "O Google Gemini retornou uma resposta fora do formato esperado.");
  }
  return null;
}

// Executa uma chamada à IA e converte qualquer falha para o padrão de erros do Chefinho.
// Nunca devolve a mensagem bruta do provedor ao cliente; ela só vai para o log do servidor.
export async function chamarIA<T>(chamada: () => Promise<T>): Promise<T> {
  try {
    return await chamada();
  } catch (err) {
    const convertido = converterErroIA(err);
    if (!convertido) throw err; // erro inesperado de código: vira INTERNAL_ERROR no handler
    if (!(err instanceof AppError)) {
      // Só erros HTTP do provedor têm mensagem segura para log. Falhas de leitura da
      // resposta registram apenas o tipo, para não gravar texto gerado a partir de dados de usuários.
      const e = err as { name?: string; status?: number; message?: string };
      const detalhe = typeof e.status === "number" ? `: ${String(e.message).slice(0, 300)}` : "";
      console.error(`[ia] ${e.name ?? "Erro"} status=${e.status ?? "-"}${detalhe}`);
    }
    throw convertido;
  }
}
