import { env } from "../config/env";
import { USER_AGENT } from "../utils/download";
import type { ProvedorDeImagem } from "./image.tool";

const API_UNSPLASH = "https://api.unsplash.com";

async function chamarUnsplash(url: URL): Promise<any> {
  if (!env.unsplashAccessKey) throw new Error("UNSPLASH_ACCESS_KEY não está configurada");

  const res = await fetch(url, {
    headers: {
      authorization: `Client-ID ${env.unsplashAccessKey}`,
      "accept-version": "v1",
      accept: "application/json",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(env.mediaTimeoutMs),
  });
  if (!res.ok) throw new Error(`o Unsplash respondeu com status ${res.status}`);
  return res.json();
}

// A busca do Unsplash funciona com termos em inglês, por isso a consulta chega como titulo_ingles.
// content_filter=high evita fotos impróprias em uma busca feita a partir de texto do usuário.
async function buscarFotoNoUnsplash(termo: string): Promise<{ url: string; downloadLocation?: string } | null> {
  const url = new URL("/search/photos", API_UNSPLASH);
  url.search = new URLSearchParams({ query: termo, per_page: "1", content_filter: "high" }).toString();

  const dados = await chamarUnsplash(url);
  const foto = dados?.results?.[0];
  const imagem = foto?.urls?.regular;
  if (!imagem) return null;

  return { url: imagem, downloadLocation: foto.links?.download_location };
}

// Exigência da API do Unsplash: informar o download sempre que uma foto é usada no app
async function registrarDownload(downloadLocation: string): Promise<void> {
  await chamarUnsplash(new URL(downloadLocation));
}

// Termos tentados em ordem: o nome completo e, se não houver foto, a palavra principal
// (ex.: "Chicken stroganoff" -> "Chicken"). Palavras curtas como "with" ou "de" não entram no fallback.
function termosDeBusca(consulta: string): string[] {
  const principal = consulta
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .find((p) => p.length >= 4);
  return [...new Set([consulta, ...(principal ? [principal] : [])])];
}

// Fotos da API do Unsplash (https://unsplash.com/developers)
export const unsplash: ProvedorDeImagem = {
  async buscarImagem(consulta) {
    for (const termo of termosDeBusca(consulta)) {
      const foto = await buscarFotoNoUnsplash(termo);
      if (!foto) continue;

      if (foto.downloadLocation) {
        registrarDownload(foto.downloadLocation).catch((err) =>
          console.warn(`[tool:imagem] aviso de download do Unsplash não foi registrado: ${(err as Error).message}`)
        );
      }
      return foto.url;
    }
    return null;
  },
};

// Ordem de tentativa: se um provedor falhar ou não achar uma foto válida, o próximo é usado
export const PROVEDORES_IMAGEM_PADRAO: ProvedorDeImagem[] = [unsplash];
