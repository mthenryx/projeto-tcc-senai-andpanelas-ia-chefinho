import "dotenv/config";

// A versão do agente vem do package.json (fonte única)
const pkg = require("../../package.json") as { version: string };

export const AGENT = { name: "Chefinho", version: pkg.version } as const;

function numero(valor: string | undefined, padrao: number): number {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

export const env = {
  port: numero(process.env.PORT, 3001),
  googleApiKey: process.env.GOOGLE_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  // Opcional: se definida, as rotas exigem o header "x-api-key" com este valor
  apiKey: process.env.CHEFINHO_API_KEY,
  aiTimeoutMs: numero(process.env.AI_TIMEOUT_MS, 60_000),
  mediaTimeoutMs: numero(process.env.MEDIA_TIMEOUT_MS, 10_000),
};
