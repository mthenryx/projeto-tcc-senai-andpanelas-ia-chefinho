import "./setup";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../utils/errors";
import { errorResponse, successResponse } from "../utils/response";
import { AGENT } from "../config/env";

describe("envelope padrão", () => {
  it("sucesso tem o formato do contrato", () => {
    const r = successResponse({ message: "oi" });
    assert.deepEqual(r, {
      status_code: 200,
      success: true,
      agent: { name: "Chefinho", version: AGENT.version },
      message: "Operação realizada com sucesso.",
      response_ia: { message: "oi" },
      error: null,
    });
  });

  it("erro tem código, mensagem e response_ia nulo", () => {
    const r = errorResponse(new AppError("INVALID_REQUEST", "O campo 'pergunta_atual' é obrigatório."));
    assert.equal(r.status_code, 400);
    assert.equal(r.success, false);
    assert.equal(r.message, "Dados inválidos.");
    assert.equal(r.response_ia, null);
    assert.deepEqual(r.error, {
      code: "INVALID_REQUEST",
      message: "O campo 'pergunta_atual' é obrigatório.",
      details: null,
    });
  });

  it("a versão vem do package.json", () => {
    assert.match(AGENT.version, /^\d+\.\d+\.\d+$/);
  });
});
