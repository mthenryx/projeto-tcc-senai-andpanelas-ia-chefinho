import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { executarComFallback } from "../config/gemini";
import { CHAT_SYSTEM_PROMPT } from "../prompts/chat.prompt";
import type { ChatEntrada, MensagemHistorico } from "../schemas/chat.schema";
import { AppError } from "../utils/errors";
import { chamarIA, extrairTexto } from "../utils/ia";

// Monta: SystemMessage + histórico recebido (Human/AI) + pergunta atual (Human).
// O Gemini exige que a conversa comece pelo usuário e alterne os papéis,
// então o histórico é normalizado antes de ser enviado.
export function montarMensagensChat(
  historico: MensagemHistorico[],
  perguntaAtual: string
): BaseMessage[] {
  const turnos: { papel: "user" | "agente"; texto: string }[] = [];

  // Se o backend já salvou a pergunta atual e a incluiu no histórico, ignora a duplicata
  const ultimo = historico[historico.length - 1];
  const base =
    ultimo && ultimo.papel === "user" && ultimo.mensagem.trim() === perguntaAtual.trim()
      ? historico.slice(0, -1)
      : historico;

  for (const item of [...base, { papel: "user" as const, mensagem: perguntaAtual }]) {
    if (turnos.length === 0 && item.papel === "agente") continue; // precisa começar pelo usuário
    const anterior = turnos[turnos.length - 1];
    if (anterior && anterior.papel === item.papel) {
      anterior.texto += `\n\n${item.mensagem}`; // papéis repetidos viram uma só mensagem
    } else {
      turnos.push({ papel: item.papel, texto: item.mensagem });
    }
  }

  return [
    new SystemMessage(CHAT_SYSTEM_PROMPT),
    ...turnos.map((t) => (t.papel === "user" ? new HumanMessage(t.texto) : new AIMessage(t.texto))),
  ];
}

export async function responderChat(entrada: ChatEntrada): Promise<{ message: string }> {
  const mensagens = montarMensagensChat(entrada.historico_conversa, entrada.pergunta_atual);
  const resposta = await chamarIA(() =>
    executarComFallback("chat", (modelo, opcoes) => modelo.invoke(mensagens, { signal: opcoes.signal }))
  );

  const message = extrairTexto(resposta.content).trim();
  if (!message) {
    throw new AppError("AI_RESPONSE_INVALID", "O Google Gemini retornou uma resposta vazia.");
  }
  return { message };
}
