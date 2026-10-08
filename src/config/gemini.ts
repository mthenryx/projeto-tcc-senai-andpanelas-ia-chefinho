import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "./env";
import { AppError } from "../utils/errors";

export type PerfilModelo = "chat" | "moderacao" | "pesquisa";

const TEMPERATURAS: Record<PerfilModelo, number> = {
  chat: 0.7,
  moderacao: 0.2, // decisões mais estáveis
  pesquisa: 0.7,
};

const instancias = new Map<PerfilModelo, ChatGoogleGenerativeAI>();

// A instância é criada só no primeiro uso: assim a API (e a rota de status)
// sobe mesmo que a GOOGLE_API_KEY ainda não tenha sido configurada.
export function obterModelo(perfil: PerfilModelo): ChatGoogleGenerativeAI {
  const existente = instancias.get(perfil);
  if (existente) return existente;

  if (!env.googleApiKey) {
    console.error("[config] GOOGLE_API_KEY não configurada.");
    throw new AppError(
      "AI_SERVICE_UNAVAILABLE",
      "Não foi possível obter uma resposta do Google Gemini."
    );
  }

  const modelo = new ChatGoogleGenerativeAI({
    model: env.geminiModel,
    temperature: TEMPERATURAS[perfil],
    apiKey: env.googleApiKey,
    maxRetries: 2,
  });
  instancias.set(perfil, modelo);
  return modelo;
}
