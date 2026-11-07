import { env } from "../config/env";
import { USER_AGENT } from "../utils/download";
import type { ProvedorDeImagem } from "./image.tool";

const TIPOS_DE_IMAGEM = ["image/jpeg", "image/png", "image/webp"];

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Exige que o título do resultado compartilhe ao menos uma palavra relevante com a receita,
// para não entregar uma foto aleatória da busca
function combinaComConsulta(titulo: string, consulta: string): boolean {
  const palavras = normalizar(consulta)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4);
  const alvo = normalizar(titulo);
  return palavras.some((p) => alvo.includes(p));
}

// Ordem de tentativa: o título completo primeiro ("Frango Xadrez") e, se não achar foto, só a
// primeira palavra principal ("Frango"). Palavras seguintes, como "Xadrez", não entram no fallback
// porque puxam fotos de outro assunto (ex.: tabuleiro de xadrez).
function termosDeBusca(consulta: string): string[] {
  const principal = consulta
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .find((p) => normalizar(p).length >= 4);
  return [...new Set([consulta, ...(principal ? [principal] : [])])];
}

async function consultarWikimedia(base: string, parametros: Record<string, string>): Promise<any> {
  const url = new URL(base);
  url.search = new URLSearchParams({ ...parametros, format: "json" }).toString();

  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(env.mediaTimeoutMs),
  });
  if (!res.ok) throw new Error(`a Wikimedia respondeu com status ${res.status}`);
  return res.json();
}

async function buscarNaWikipedia(termo: string): Promise<string | null> {
  const dados = await consultarWikimedia("https://pt.wikipedia.org/w/api.php", {
    action: "query",
    generator: "search",
    gsrsearch: termo,
    gsrlimit: "10",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "800",
  });

  const paginas = Object.values(dados?.query?.pages ?? {}) as {
    title: string;
    index: number;
    thumbnail?: { source?: string };
  }[];

  const melhor = paginas
    .sort((a, b) => a.index - b.index)
    .find((p) => p.thumbnail?.source && combinaComConsulta(p.title, termo));

  return melhor?.thumbnail?.source ?? null;
}

async function buscarNaCommons(termo: string): Promise<string | null> {
  const dados = await consultarWikimedia("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    generator: "search",
    gsrnamespace: "6", // namespace de arquivos
    gsrsearch: termo,
    gsrlimit: "10",
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "800",
  });

  const arquivos = Object.values(dados?.query?.pages ?? {}) as {
    title: string;
    index: number;
    imageinfo?: { mime?: string; thumburl?: string }[];
  }[];

  const melhor = arquivos
    .sort((a, b) => a.index - b.index)
    .find((a) => {
      const info = a.imageinfo?.[0];
      return !!info?.thumburl && TIPOS_DE_IMAGEM.includes(info.mime ?? "") && combinaComConsulta(a.title.replace(/^File:/i, ""), termo);
    });

  return melhor?.imageinfo?.[0]?.thumburl ?? null;
}

// Fotos de artigos da Wikipédia em português (melhor cobertura de pratos brasileiros)
export const wikipediaPt: ProvedorDeImagem = {
  async buscarImagem(consulta) {
    for (const termo of termosDeBusca(consulta)) {
      const url = await buscarNaWikipedia(termo);
      if (url) return url;
    }
    return null;
  },
};

// Fotos do repositório de mídia livre da Wikimedia (alternativa quando a Wikipédia não tem a foto)
export const wikimediaCommons: ProvedorDeImagem = {
  async buscarImagem(consulta) {
    for (const termo of termosDeBusca(consulta)) {
      const url = await buscarNaCommons(termo);
      if (url) return url;
    }
    return null;
  },
};

// Ordem de tentativa: se um provedor falhar ou não achar uma foto válida, o próximo é usado
export const PROVEDORES_IMAGEM_PADRAO: ProvedorDeImagem[] = [wikipediaPt, wikimediaCommons];