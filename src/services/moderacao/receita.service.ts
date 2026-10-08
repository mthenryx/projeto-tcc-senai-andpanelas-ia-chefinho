import { MODERACAO_RECEITA_PROMPT } from "../../prompts/moderacao/receita.prompt";
import type { ModeracaoReceitaEntrada } from "../../schemas/moderacao-receita.schema";
import type { DecisaoModeracao } from "../../schemas/moderacao.schema";
import { blocosDeImagens } from "../../tools/image.tool";
import { blocosDeVideos } from "../../tools/video.tool";
import { decidirModeracao } from "./decisao";

export async function moderarReceita(entrada: ModeracaoReceitaEntrada): Promise<DecisaoModeracao> {
  const { receita } = entrada;

  // As URLs não vão no texto: a mídia é baixada e anexada à mensagem
  const dados = {
    tipo_analisado: "RECEITA",
    motivo_denuncia: entrada.motivo,
    detalhe_denuncia: entrada.detalhe,
    receita: {
      titulo: receita.titulo,
      descricao: receita.descricao ?? "",
      tempo: receita.tempo,
      ingredientes: receita.ingredientes,
      modo_preparo: receita.modo_preparo,
      categorias: receita.categorias,
      tags: receita.tags,
    },
  };

  const [imagens, videos] = await Promise.all([
    blocosDeImagens([{ rotulo: "Foto da receita", url: receita.foto }]),
    blocosDeVideos([{ rotulo: "Vídeo da receita", url: receita.video }]),
  ]);

  return decidirModeracao(MODERACAO_RECEITA_PROMPT, dados, [...imagens, ...videos]);
}
