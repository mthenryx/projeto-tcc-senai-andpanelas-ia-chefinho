import { tool } from "@langchain/core/tools";
import type { MessageContentComplex } from "@langchain/core/messages";
import { z } from "zod";
import { AppError } from "../utils/errors";
import { baixarArquivo, DownloadError } from "../utils/download";

// ---------------------------------------------------------------------------
// 1) Analisar imagem recebida por URL: URL -> baixar -> validar -> base64 -> Gemini
// ---------------------------------------------------------------------------

const MAX_IMAGEM_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImagemPreparada {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
}

// O tipo é identificado pelos bytes do arquivo, não pelo que o servidor declara
function detectarMime(b: Buffer): ImagemPreparada["mimeType"] | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function prepararImagem(url: string): Promise<ImagemPreparada> {
  let buffer: Buffer;
  try {
    buffer = await baixarArquivo(url, { maxBytes: MAX_IMAGEM_BYTES, accept: "image/*" });
  } catch (err) {
    if (err instanceof DownloadError) {
      throw new AppError("INVALID_IMAGE_URL", `Não foi possível obter a imagem: ${err.message}.`, {
        motivo: err.message,
      });
    }
    throw err;
  }

  const mimeType = detectarMime(buffer);
  if (!mimeType) {
    throw new AppError("INVALID_IMAGE_URL", "O arquivo da URL não é uma imagem JPEG, PNG ou WEBP.", {
      motivo: "formato não suportado",
    });
  }
  return { mimeType, base64: buffer.toString("base64") };
}

export interface ImagemEntrada {
  rotulo: string; // ex.: "Foto da receita"
  url?: string | null;
}

// Devolve os blocos de conteúdo (rótulo + imagem) prontos para uma HumanMessage.
// Entradas sem URL são ignoradas.
export async function blocosDeImagens(entradas: ImagemEntrada[]): Promise<MessageContentComplex[]> {
  const comUrl = entradas.filter((e): e is ImagemEntrada & { url: string } => !!e.url);
  const prontas = await Promise.all(comUrl.map((e) => prepararImagem(e.url)));

  return comUrl.flatMap((e, i) => [
    { type: "text", text: `${e.rotulo}:` },
    {
      type: "image_url",
      image_url: { url: `data:${prontas[i].mimeType};base64,${prontas[i].base64}` },
    },
  ]);
}

// ---------------------------------------------------------------------------
// 2) Buscar imagem nova (pesquisa de receitas): o provedor externo é plugável
// ---------------------------------------------------------------------------

export interface ProvedorDeImagem {
  // Retorna a URL de uma imagem para a consulta, ou null se não encontrar
  buscarImagem(consulta: string): Promise<string | null>;
}

let provedor: ProvedorDeImagem | null = null;

export function registrarProvedorDeImagem(novo: ProvedorDeImagem | null): void {
  provedor = novo;
}

export function provedorDeImagemConfigurado(): boolean {
  return provedor !== null;
}

export async function buscarImagem(consulta: string): Promise<string | null> {
  if (!provedor) return null;
  try {
    return await provedor.buscarImagem(consulta);
  } catch (err) {
    console.error("[tool:imagem] falha no provedor:", (err as Error).message);
    throw new AppError("TOOL_ERROR", "Falha ao buscar imagem no provedor externo.");
  }
}

// Versão para o LangChain: pode ser ligada ao modelo com model.bindTools([...]) no futuro
export const ferramentaBuscarImagem = tool(
  async ({ consulta }) => {
    const url = await buscarImagem(consulta);
    return url ?? "Nenhuma imagem encontrada.";
  },
  {
    name: "buscar_imagem_receita",
    description: "Busca a URL de uma foto para uma receita ou prato.",
    schema: z.object({ consulta: z.string().describe("Nome da receita ou prato") }),
  }
);
