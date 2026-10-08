import "./setup";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { montarMensagensChat } from "../services/chat.service";

const tipos = (msgs: ReturnType<typeof montarMensagensChat>) => msgs.map((m) => m.getType());
const textos = (msgs: ReturnType<typeof montarMensagensChat>) => msgs.map((m) => String(m.content));

describe("montarMensagensChat", () => {
  it("monta System + histórico (human/ai) + pergunta atual", () => {
    const msgs = montarMensagensChat(
      [
        { papel: "user", mensagem: "Quero uma receita de frango" },
        { papel: "agente", mensagem: "Que tal frango cremoso?" },
      ],
      "E de café da manhã?"
    );
    assert.deepEqual(tipos(msgs), ["system", "human", "ai", "human"]);
    assert.equal(textos(msgs)[3], "E de café da manhã?");
  });

  it("sem histórico: só System + pergunta", () => {
    assert.deepEqual(tipos(montarMensagensChat([], "Oi")), ["system", "human"]);
  });

  it("ignora mensagens do agente no começo (o Gemini exige começar pelo usuário)", () => {
    const msgs = montarMensagensChat(
      [
        { papel: "agente", mensagem: "Olá! Sou o Chefinho." },
        { papel: "user", mensagem: "Oi" },
        { papel: "agente", mensagem: "Como posso ajudar?" },
      ],
      "Quero um bolo"
    );
    assert.deepEqual(tipos(msgs), ["system", "human", "ai", "human"]);
  });

  it("junta papéis repetidos para manter a alternância", () => {
    const msgs = montarMensagensChat(
      [
        { papel: "user", mensagem: "Oi" },
        { papel: "user", mensagem: "Tem receita de frango?" },
        { papel: "agente", mensagem: "Tenho!" },
      ],
      "Pode ser rápida?"
    );
    assert.deepEqual(tipos(msgs), ["system", "human", "ai", "human"]);
    assert.match(textos(msgs)[1], /Oi\n\nTem receita de frango\?/);
  });

  it("não duplica a pergunta quando o backend já a incluiu no histórico", () => {
    const msgs = montarMensagensChat(
      [
        { papel: "user", mensagem: "Oi" },
        { papel: "agente", mensagem: "Olá!" },
        { papel: "user", mensagem: "Quero um bolo" },
      ],
      "Quero um bolo"
    );
    assert.deepEqual(tipos(msgs), ["system", "human", "ai", "human"]);
    assert.equal(textos(msgs).filter((t) => t === "Quero um bolo").length, 1);
  });
});
