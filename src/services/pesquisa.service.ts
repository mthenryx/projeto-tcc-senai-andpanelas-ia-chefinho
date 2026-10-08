import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { obterModelo } from "../config/gemini";
import { PESQUISA_PROMPT } from "../prompts/pesquisa.prompt";
import {
  pesquisaIASchema,
  PesquisaEntrada,
  ReceitaGerada,
  RespostaPesquisa,
} from "../schemas/pesquisa.schema";
import { buscarImagem } from "../tools/image.tool";
import { buscarVideo } from "../tools/video.tool";
import { AppError } from "../utils/errors";
import { chamarIA, sinalDeTimeout } from "../utils/ia";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

// Se o provedor de mídia falhar, a receita é entregue mesmo assim, sem a mídia
async function midiaOuNulo(buscar: () => Promise<string | null>): Promise<string | null> {
  try {
    return await buscar();
  } catch (err) {
    if (err instanceof AppError && err.code === "TOOL_ERROR") return null;
    throw err;
  }
}

export async function pesquisarComIA(entrada: PesquisaEntrada): Promise<RespostaPesquisa> {
  // As URLs de foto/vídeo das receitas encontradas não ajudam a decidir e não são enviadas
  const dados = {
    pesquisa_usuario: entrada.pesquisa_usuario,
    receitas_encontradas: entrada.encontrados_db.map((r) => ({
      titulo: r.titulo,
      descricao: r.descricao ?? "",
      tempo: r.tempo,
      custo: r.custo,
      dificuldade: r.dificuldade,
      porcao: r.porcao,
    })),
  };

  const modelo = obterModelo("pesquisa").withStructuredOutput(pesquisaIASchema);
  const resultado = await chamarIA(() =>
    modelo.invoke(
      [
        new SystemMessage(PESQUISA_PROMPT),
        new HumanMessage(`Dados da pesquisa (JSON):\n${JSON.stringify(dados, null, 2)}`),
      ],
      { signal: sinalDeTimeout() }
    )
  );

  if (!resultado.tem_sugestao) return { possui_sugestao: false, receita: null };
  if (!resultado.receita) {
    throw new AppError("AI_RESPONSE_INVALID", "O Google Gemini indicou uma sugestão sem enviar a receita.");
  }

  const receita = resultado.receita;

  // Não sugere de novo uma receita que o banco já devolveu
  const jaExiste = entrada.encontrados_db.some(
    (r) => normalizar(r.titulo) === normalizar(receita.titulo)
  );
  if (jaExiste) return { possui_sugestao: false, receita: null };

  // Garante a ordem e a numeração (1, 2, 3...) dos passos
  const passos = [...receita.modo_preparo]
    .sort((a, b) => a.ordem_preparo - b.ordem_preparo)
    .map((p, i) => ({ ...p, ordem_preparo: i + 1 }));

  const [foto, video] = await Promise.all([
    midiaOuNulo(() => buscarImagem(receita.titulo)),
    midiaOuNulo(() => buscarVideo(receita.titulo)),
  ]);

  const receitaGerada: ReceitaGerada = {
    ...receita,
    porcao: Math.max(1, Math.round(receita.porcao)),
    modo_preparo: passos,
    foto,
    video,
  };
  return { possui_sugestao: true, receita: receitaGerada };
}
