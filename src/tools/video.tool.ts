import { tool } from "@langchain/core/tools";
import type { MessageContentComplex } from "@langchain/core/messages";
import { z } from "zod";
import { AppError } from "../utils/errors";
import { baixarArquivo, DownloadError } from "../utils/download";

// ---------------------------------------------------------------------------
// 1) Analisar vídeo recebido por URL: URL -> baixar -> validar -> base64 -> Gemini
// ---------------------------------------------------------------------------

// O vídeo vai "inline" na requisição ao Gemini, que aceita cerca de 20 MB no total.
const MAX_VIDEO_BYTES = 14 * 1024 * 1024; // 14 MB

export interface VideoPreparado {
  mimeType: "video/mp4" | "video/quicktime" | "video/webm";
  base64: string;
}

function detectarMime(b: Buffer): VideoPreparado["mimeType"] | null {
  if (b.length > 12 && b.toString("ascii", 4, 8) === "ftyp") {
    return b.toString("ascii", 8, 12) === "qt  " ? "video/quicktime" : "video/mp4";
  }
  if (b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

export async function prepararVideo(url: string): Promise<VideoPreparado> {
  let buffer: Buffer;
  try {
    buffer = await baixarArquivo(url, { maxBytes: MAX_VIDEO_BYTES, accept: "video/*" });
  } catch (err) {
    if (err instanceof DownloadError) {
      throw new AppError("INVALID_VIDEO_URL", `Não foi possível obter o vídeo: ${err.message}.`, {
        motivo: err.message,
      });
    }
    throw err;
  }

  const mimeType = detectarMime(buffer);
  if (!mimeType) {
    throw new AppError(
      "INVALID_VIDEO_URL",
      "O arquivo da URL não é um vídeo MP4, MOV ou WEBM (links de YouTube e similares não são aceitos).",
      { motivo: "formato não suportado" }
    );
  }
  return { mimeType, base64: buffer.toString("base64") };
}

export interface VideoEntrada {
  rotulo: string; // ex.: "Vídeo da receita"
  url?: string | null;
}

export async function blocosDeVideos(entradas: VideoEntrada[]): Promise<MessageContentComplex[]> {
  const comUrl = entradas.filter((e): e is VideoEntrada & { url: string } => !!e.url);
  const prontos = await Promise.all(comUrl.map((e) => prepararVideo(e.url)));

  return comUrl.flatMap((e, i) => [
    { type: "text", text: `${e.rotulo}:` },
    { type: "media", mimeType: prontos[i].mimeType, data: prontos[i].base64 },
  ]);
}

// ---------------------------------------------------------------------------
// 2) Buscar vídeo novo (pesquisa de receitas): o provedor externo é plugável
// ---------------------------------------------------------------------------

export interface ProvedorDeVideo {
  buscarVideo(consulta: string): Promise<string | null>;
}

let provedor: ProvedorDeVideo | null = null;

export function registrarProvedorDeVideo(novo: ProvedorDeVideo | null): void {
  provedor = novo;
}

export function provedorDeVideoConfigurado(): boolean {
  return provedor !== null;
}

export async function buscarVideo(consulta: string): Promise<string | null> {
  if (!provedor) return null;
  try {
    return await provedor.buscarVideo(consulta);
  } catch (err) {
    console.error("[tool:video] falha no provedor:", (err as Error).message);
    throw new AppError("TOOL_ERROR", "Falha ao buscar vídeo no provedor externo.");
  }
}

export const ferramentaBuscarVideo = tool(
  async ({ consulta }) => {
    const url = await buscarVideo(consulta);
    return url ?? "Nenhum vídeo encontrado.";
  },
  {
    name: "buscar_video_receita",
    description: "Busca a URL de um vídeo para uma receita ou prato.",
    schema: z.object({ consulta: z.string().describe("Nome da receita ou prato") }),
  }
);
