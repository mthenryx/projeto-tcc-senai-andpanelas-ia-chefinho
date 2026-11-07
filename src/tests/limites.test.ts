import "./setup";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { comHashtag, limitarTexto } from "../utils/texto";
import { receitaGeradaSchema } from "../schemas/pesquisa.schema";

describe("limitarTexto", () => {
  it("não mexe em texto dentro do limite", () => {
    assert.equal(limitarTexto("Oi, tudo bem?", 3000), "Oi, tudo bem?");
  });

  it("nunca passa do máximo de caracteres", () => {
    const longo = "palavra ".repeat(1000);
    assert.ok(Array.from(limitarTexto(longo, 3000)).length <= 3000);
  });

  it("corta no fim de uma frase quando possível", () => {
    const texto = "Primeira frase bem completa aqui. " + "x".repeat(50);
    assert.equal(limitarTexto(texto, 40), "Primeira frase bem completa aqui.");
  });

  it("corta no fim de uma palavra se não houver frase", () => {
    const texto = "um dois três quatro cinco seis sete";
    const r = limitarTexto(texto, 12);
    assert.ok(Array.from(r).length <= 12);
    assert.ok(!r.endsWith(" "));
  });

  it("conta caracteres e não unidades de código (emoji conta como 1)", () => {
    const texto = "🍲".repeat(10);
    assert.equal(limitarTexto(texto, 4), "🍲🍲🍲🍲");
  });
});

describe("receitaGeradaSchema (limites do banco)", () => {
  const base = {
    titulo: "Feijoada",
    descricao: "Prato tradicional.",
    tempo: "01:30:00",
    custo: "Médio",
    dificuldade: "Média",
    porcao: 4,
    ingredientes: [{ nome: "feijão", quantidade: "500", id_unidade_medida: "g" }],
    modo_preparo: [{ metodo_preparo: "Cozinhar o feijão.", ordem_preparo: 1 }],
    categorias: [],
    tags: [],
    foto: "https://exemplo.com/foto.jpg",
    video: null,
  };

  it("aceita receita dentro dos limites", () => {
    assert.ok(receitaGeradaSchema.safeParse(base).success);
  });

  it("recusa título com mais de 50 caracteres", () => {
    assert.ok(!receitaGeradaSchema.safeParse({ ...base, titulo: "a".repeat(51) }).success);
  });

  it("recusa tempo fora do formato HH:MM:SS", () => {
    assert.ok(!receitaGeradaSchema.safeParse({ ...base, tempo: "90 min" }).success);
  });

  it("recusa passo com mais de 250 caracteres", () => {
    const passo = [{ metodo_preparo: "a".repeat(251), ordem_preparo: 1 }];
    assert.ok(!receitaGeradaSchema.safeParse({ ...base, modo_preparo: passo }).success);
  });
});

describe("comHashtag", () => {
  it("adiciona # quando a tag não tem", () => {
    assert.equal(comHashtag("frango"), "#frango");
  });
  it("mantém uma única # quando já existe", () => {
    assert.equal(comHashtag("#frango"), "#frango");
  });
  it("corrige ## e espaços", () => {
    assert.equal(comHashtag("  ##rapido "), "#rapido");
  });
});