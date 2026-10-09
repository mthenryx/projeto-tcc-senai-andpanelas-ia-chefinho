import { MODERACAO_PERFIL_PROMPT } from "../../prompts/moderacao/perfil.prompt";

import type { ModeracaoPerfilEntrada } from "../../schemas/moderacao-perfil.schema";

import type { DecisaoModeracao } from "../../schemas/moderacao.schema";

import { blocosDeImagens } from "../../tools/image.tool";

import { decidirModeracao } from "./decisao";

export async function moderarPerfil(
  entrada: ModeracaoPerfilEntrada
): Promise<DecisaoModeracao> {
  const { dados_usuario: usuario } = entrada;

  // Privacidade: apenas nome e username são enviados como dados textuais.
  const dados = {
    tipo_analisado: "PERFIL DE USUÁRIO",
    motivo_denuncia: entrada.motivo,
    detalhe_denuncia: entrada.detalhe,
    perfil: {
      nome: usuario.nome,
      username: usuario.username,
    },
  };

  const imagens = await blocosDeImagens([
    {
      rotulo: "Foto de perfil",
      url: usuario.foto_perfil,
      ignorarFalha: true,
    },
    {
      rotulo: "Banner do perfil",
      url: usuario.banner_url,
      ignorarFalha: true,
    },
  ]);

  return decidirModeracao(
    MODERACAO_PERFIL_PROMPT,
    dados,
    imagens
  );
}