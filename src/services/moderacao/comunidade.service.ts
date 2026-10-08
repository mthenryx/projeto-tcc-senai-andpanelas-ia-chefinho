import { MODERACAO_COMUNIDADE_PROMPT } from "../../prompts/moderacao/comunidade.prompt";
import type { ModeracaoComunidadeEntrada } from "../../schemas/moderacao-comunidade.schema";
import type { DecisaoModeracao } from "../../schemas/moderacao.schema";
import { blocosDeImagens } from "../../tools/image.tool";
import { decidirModeracao } from "./decisao";

export async function moderarComunidade(
  entrada: ModeracaoComunidadeEntrada
): Promise<DecisaoModeracao> {
  const { comunidade } = entrada;

  const dados = {
    tipo_analisado: "COMUNIDADE",
    motivo_denuncia: entrada.motivo,
    detalhe_denuncia: entrada.detalhe,
    comunidade: {
      nome: comunidade.nome,
      descricao: comunidade.descricao ?? "",
      categoria_principal: comunidade.id_categoria_principal,
    },
  };

  const imagens = await blocosDeImagens([
    { rotulo: "Foto da comunidade", url: comunidade.foto_url },
    { rotulo: "Banner da comunidade", url: comunidade.banner_url },
  ]);

  return decidirModeracao(MODERACAO_COMUNIDADE_PROMPT, dados, imagens);
}
