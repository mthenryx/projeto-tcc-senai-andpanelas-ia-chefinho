import { tool } from "@langchain/core/tools";
import type { MessageContentComplex } from "@langchain/core/messages";
import { z } from "zod";
import { AppError } from "../utils/errors";
import { baixarArquivo, DownloadError } from "../utils/download";
import { PROVEDORES_IMAGEM_PADRAO } from "./provedores-imagem";

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
  rotulo: string;
  url?: string | null;
  ignorarFalha?: boolean;
}

// Devolve os blocos de conteúdo (rótulo + imagem) prontos para uma HumanMessage.
// Entradas sem URL são ignoradas.
export async function blocosDeImagens(
  entradas: ImagemEntrada[]
): Promise<MessageContentComplex[]> {
  const comUrl = entradas.filter(
    (e): e is ImagemEntrada & { url: string } => !!e.url
  );

  const resultados = await Promise.all(
    comUrl.map(async (entrada) => {
      try {
        const preparada = await prepararImagem(entrada.url);

        return {
          entrada,
          preparada,
        };
      } catch (erro) {
        if (!entrada.ignorarFalha) {
          throw erro;
        }

        console.warn(
          `[tool:imagem] Não foi possível carregar "${entrada.rotulo}". A imagem será ignorada.`
        );

        return null;
      }
    })
  );

  return resultados.flatMap(
    (resultado): MessageContentComplex[] => {
      if (!resultado) return [];

      const { entrada, preparada } = resultado;

      return [
        {
          type: "text",
          text: `${entrada.rotulo}:`,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${preparada.mimeType};base64,${preparada.base64}`,
          },
        },
      ];
    }
  );
}

// ---------------------------------------------------------------------------
// 2) Buscar imagem nova (pesquisa de receitas): o provedor externo é plugável
// ---------------------------------------------------------------------------

export interface ProvedorDeImagem {
  // Retorna a URL de uma imagem para a consulta, ou null se não encontrar
  buscarImagem(consulta: string): Promise<string | null>;
}

// Provedores tentados em ordem: se um falhar ou não achar uma foto válida, o próximo é usado
let provedores: ProvedorDeImagem[] = PROVEDORES_IMAGEM_PADRAO;

// Aceita um provedor, uma lista (em ordem) ou null para remover todos
export function registrarProvedorDeImagem(novo: ProvedorDeImagem | ProvedorDeImagem[] | null): void {
  provedores = novo === null ? [] : Array.isArray(novo) ? novo : [novo];
}

export function provedorDeImagemConfigurado(): boolean {
  return provedores.length > 0;
}

// Devolve a URL de uma foto que foi baixada e validada (imagem real, de tamanho permitido e em endereço público).
// Se nenhum provedor entregar uma foto válida, lança TOOL_ERROR: a sugestão de receita não pode sair sem foto.
export async function buscarImagem(consulta: string): Promise<string> {
  for (const [indice, provedorAtual] of provedores.entries()) {
    try {
      const url = await provedorAtual.buscarImagem(consulta);
      if (!url) continue;
      await prepararImagem(url); // lança erro se a URL não for uma imagem utilizável
      return url;
    } catch (err) {
      console.warn(`[tool:imagem] provedor ${indice + 1} não retornou foto válida: ${(err as Error).message}`);
    }
  }
  throw new AppError("TOOL_ERROR", "Não foi possível obter uma foto para a receita.");
}

// Versão para o LangChain: pode ser ligada ao modelo com model.bindTools([...]) no futuro
export const ferramentaBuscarImagem = tool(
  async ({ consulta }) => buscarImagem(consulta),
  {
    name: "buscar_imagem_receita",
    description: "Busca a URL de uma foto para uma receita ou prato.",
    schema: z.object({ consulta: z.string().describe("Nome da receita ou prato") }),
  }
);
