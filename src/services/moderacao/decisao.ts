import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { ContentBlock, MessageContentComplex } from "@langchain/core/messages";
import { obterModelo } from "../../config/gemini";
import { DecisaoModeracao, decisaoModeracaoSchema } from "../../schemas/moderacao.schema";
import { chamarIA, sinalDeTimeout } from "../../utils/ia";

// Parte comum das três moderações: envia prompt + dados (+ mídia) e recebe { apagar }.
// Cada tipo de denúncia continua com o seu próprio prompt, schema e service.
export async function decidirModeracao(
  promptSistema: string,
  dados: Record<string, unknown>,
  midias: MessageContentComplex[]
): Promise<DecisaoModeracao> {
  const conteudo: MessageContentComplex[] = [
    { type: "text", text: `Dados para análise (JSON):\n${JSON.stringify(dados, null, 2)}` },
    ...midias,
  ];

  const modelo = obterModelo("moderacao").withStructuredOutput(decisaoModeracaoSchema);

  return chamarIA(() =>
    modelo.invoke([new SystemMessage(promptSistema), new HumanMessage({ content: conteudo as ContentBlock[] })], {
      signal: sinalDeTimeout(),
    })
  );
}
