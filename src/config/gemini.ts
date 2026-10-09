import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "./env";
import { AppError } from "../utils/errors";
export type PerfilModelo = "chat" | "moderacao" | "pesquisa";

type OpcoesChamadaGemini = {
  timeout: number;
  signal: AbortSignal;
  maxRetries: number;
};

type OperacaoModelo<T> = (
  modelo: ChatGoogleGenerativeAI,
  opcoes: OpcoesChamadaGemini
) => Promise<T>;

const TEMPERATURAS: Record<PerfilModelo, number> = {
  chat: 0.7,
  moderacao: 0.2,
  pesquisa: 0.7,
};

// Modelos alternativos utilizados se o modelo principal falhar.
const MODELOS_FALLBACK = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
] as const;

const instancias = new Map<string, ChatGoogleGenerativeAI>();

function obterModeloPrincipal(): string {
  return env.geminiModel?.trim() || "gemini-3.5-flash-lite";
}

function obterInstancia(
  perfil: PerfilModelo,
  nomeModelo: string,
  maxRetries: number
): ChatGoogleGenerativeAI {
  if (!env.googleApiKey) {
    console.error("[config] GOOGLE_API_KEY não configurada.");

    throw new AppError(
      "AI_SERVICE_UNAVAILABLE",
      "Não foi possível obter uma resposta do Google Gemini."
    );
  }

  const chave = `${perfil}:${nomeModelo}:${maxRetries}`;

  const existente = instancias.get(chave);

  if (existente) {
    return existente;
  }

  const modelo = new ChatGoogleGenerativeAI({
    model: nomeModelo,
    temperature: TEMPERATURAS[perfil],
    apiKey: env.googleApiKey,
    maxRetries,
  });

  instancias.set(chave, modelo);

  return modelo;
}

// Mantém compatibilidade com os arquivos que já utilizam obterModelo().
export function obterModelo(
  perfil: PerfilModelo
): ChatGoogleGenerativeAI {
  return obterInstancia(
    perfil,
    obterModeloPrincipal(),
    2
  );
}

function deveTentarOutroModelo(erro: unknown): boolean {
  // Erros internos já tratados pela aplicação não devem gerar fallback
  // automaticamente.
  if (erro instanceof AppError) {
    return false;
  }

  const detalhes =
    typeof erro === "object" && erro !== null
      ? erro as {
          status?: unknown;
          statusCode?: unknown;
          code?: unknown;
          response?: { status?: unknown };
        }
      : {};

  const mensagem =
    erro instanceof Error
      ? erro.message
      : String(erro);

  const statusInformado =
    detalhes.status ??
    detalhes.statusCode ??
    detalhes.response?.status;

  const status = Number(statusInformado);

  const codigo = String(detalhes.code ?? "").toUpperCase();

  // Erros indicando que o próprio modelo não está disponível.
  const erroDoModelo =
    /(?:model|modelo).{0,120}(?:not found|does not exist|not available|unsupported|deprecated|unavailable)|(?:not found|does not exist|not available|unsupported|deprecated|unavailable).{0,120}(?:model|modelo)/i;

  if (erroDoModelo.test(mensagem)) {
    return true;
  }

  // Erros HTTP que podem ser temporários.
  if ([408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  // Códigos comuns de falhas de conexão e indisponibilidade.
  const codigosRecuperaveis = [
    "UNAVAILABLE",
    "RESOURCE_EXHAUSTED",
    "DEADLINE_EXCEEDED",
    "INTERNAL",
    "ABORTED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_SOCKET",
  ];

  if (codigosRecuperaveis.includes(codigo)) {
    return true;
  }

  // Identifica timeouts e falhas transitórias de rede pela mensagem.
  if (
    /timed out|timeout|fetch failed|network error|socket hang up|connection reset/i
      .test(mensagem)
  ) {
    return true;
  }

  return false;
}

export async function executarComFallback<T>(
  perfil: PerfilModelo,
  operacao: OperacaoModelo<T>
): Promise<T> {
  const modelos = Array.from(
    new Set<string>([
      obterModeloPrincipal(),
      ...MODELOS_FALLBACK,
    ])
  );

  for (let indice = 0; indice < modelos.length; indice++) {
    const nomeModelo = modelos[indice];

    try {
      // Cada modelo utilizado pelo fallback faz uma tentativa.
      // O controle das tentativas fica nesta função.
      const modelo = obterInstancia(
        perfil,
        nomeModelo,
        0
      );

      const opcoes: OpcoesChamadaGemini = {
        timeout: env.aiTimeoutMs,
        signal: AbortSignal.timeout(env.aiTimeoutMs),
        maxRetries: 0,
      };

      const resultado = await operacao(modelo, opcoes);

      if (indice > 0) {
        console.info(
          `[Gemini] Resposta obtida com modelo alternativo: ${nomeModelo}`
        );
      }

      return resultado;
    } catch (erro) {
      // Erros permanentes não devem provocar troca de modelo.
      if (!deveTentarOutroModelo(erro)) {
        throw erro;
      }

      console.warn(
        `[Gemini] Falha recuperável no modelo ${nomeModelo}.`
      );

      if (indice === modelos.length - 1) {
        console.error(
          "[Gemini] Todos os modelos configurados falharam."
        );

        throw new AppError(
          "AI_SERVICE_UNAVAILABLE",
          "Não foi possível obter uma resposta do Google Gemini."
        );
      }

      console.info(
        `[Gemini] Tentando o próximo modelo: ${modelos[indice + 1]}`
      );
    }
  }

  throw new AppError(
    "AI_SERVICE_UNAVAILABLE",
    "Não foi possível obter uma resposta do Google Gemini."
  );
}