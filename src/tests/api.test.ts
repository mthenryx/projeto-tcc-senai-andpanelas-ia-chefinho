import { instalarMocks, JPEG, MP4, PNG, respostaGemini } from "./helpers";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, afterEach, before, describe, it } from "node:test";
import { criarApp } from "../app";
import { env } from "../config/env";
import { registrarProvedorDeImagem } from "../tools/image.tool";
import { PROVEDORES_IMAGEM_PADRAO } from "../tools/provedores-imagem";

const PUBLICO = "http://93.184.216.34";
const { estado, restaurar } = instalarMocks();

let servidor: Server;
let base = "";

before(async () => {
  servidor = criarApp().listen(0);
  await new Promise((r) => servidor.once("listening", r));
  base = `http://127.0.0.1:${(servidor.address() as { port: number }).port}/v1/chefinho`;
});
after(() => {
  servidor.close();
  restaurar();
});
afterEach(() => {
  estado.googleRequests.length = 0;
  estado.googleUrls.length = 0;
  estado.responderGemini = () => respostaGemini("Resposta padrão");
  estado.wikimedia = () => ({ status: 404, body: {} });
  registrarProvedorDeImagem(PROVEDORES_IMAGEM_PADRAO);
  env.apiKey = undefined;
});

async function chamar(metodo: string, caminho: string, corpo?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: { "content-type": "application/json", ...headers },
    body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const partes = (req: any) => req.contents.flatMap((c: any) => c.parts);

describe("GET /status", () => {
  it("responde sem usar o Gemini", async () => {
    const r = await chamar("GET", "/status");
    assert.equal(r.status, 200);
    assert.equal(r.json.success, true);
    assert.equal(r.json.agent.name, "Chefinho");
    assert.equal(r.json.response_ia.message, "Chefinho está funcionando!");
    assert.equal(r.json.error, null);
    assert.equal(estado.googleRequests.length, 0);
  });

  it("rota inexistente devolve o envelope de erro", async () => {
    const r = await chamar("GET", "/nao-existe");
    assert.equal(r.status, 404);
    assert.equal(r.json.error.code, "NOT_FOUND");
    assert.equal(r.json.response_ia, null);
  });
});

describe("autenticação opcional", () => {
  it("com CHEFINHO_API_KEY definida, exige o header x-api-key (status continua público)", async () => {
    env.apiKey = "segredo-de-teste";
    assert.equal((await chamar("GET", "/status")).status, 200);

    const sem = await chamar("POST", "/chat", { pergunta_atual: "Oi" });
    assert.equal(sem.status, 401);
    assert.equal(sem.json.error.code, "UNAUTHORIZED");

    const errada = await chamar("POST", "/chat", { pergunta_atual: "Oi" }, { "x-api-key": "outra" });
    assert.equal(errada.status, 401);

    const certa = await chamar("POST", "/chat", { pergunta_atual: "Oi" }, { "x-api-key": "segredo-de-teste" });
    assert.equal(certa.status, 200);
  });
});

describe("POST /chat", () => {
  it("envia System + histórico + pergunta ao Gemini e devolve a resposta no envelope", async () => {
    estado.responderGemini = () => respostaGemini("Que tal um omelete de queijo?");
    const r = await chamar("POST", "/chat", {
      historico_conversa: [
        { papel: "agente", mensagem: "Olá!" }, // começa pelo agente: deve ser descartada
        { papel: "user", mensagem: "Quero uma receita de frango" },
        { papel: "agente", mensagem: "Que tal frango cremoso?" },
      ],
      pergunta_atual: "E o que eu posso fazer de café da manhã amanhã?",
    });

    assert.equal(r.status, 200);
    assert.equal(r.json.message, "Operação realizada com sucesso.");
    assert.equal(r.json.response_ia.message, "Que tal um omelete de queijo?");

    const req = estado.googleRequests[0];
    assert.match(JSON.stringify(req.systemInstruction), /Chefinho/);
    assert.deepEqual(req.contents.map((c: any) => c.role), ["user", "model", "user"]);
    assert.equal(req.contents[2].parts[0].text, "E o que eu posso fazer de café da manhã amanhã?");
  });

  it("aceita conversa nova (sem histórico)", async () => {
    const r = await chamar("POST", "/chat", { pergunta_atual: "Oi" });
    assert.equal(r.status, 200);
  });

  it("valida a entrada com mensagens claras e sem chamar o Gemini", async () => {
    const semPergunta = await chamar("POST", "/chat", { historico_conversa: [] });
    assert.equal(semPergunta.status, 400);
    assert.equal(semPergunta.json.error.code, "INVALID_REQUEST");
    assert.equal(semPergunta.json.error.message, "O campo 'pergunta_atual' é obrigatório.");
    assert.equal(semPergunta.json.message, "Dados inválidos.");

    const papelErrado = await chamar("POST", "/chat", {
      historico_conversa: [{ papel: "robo", mensagem: "x" }],
      pergunta_atual: "Oi",
    });
    assert.equal(papelErrado.status, 400);
    assert.equal(papelErrado.json.error.details[0].campo, "historico_conversa.0.papel");

    const jsonRuim = await chamar("POST", "/chat", "{ isso não é json");
    assert.equal(jsonRuim.status, 400);
    assert.equal(jsonRuim.json.error.code, "INVALID_REQUEST");

    assert.equal(estado.googleRequests.length, 0);
  });

  it("recusa corpo acima de 1 MB com 413", async () => {
    const r = await chamar("POST", "/chat", { pergunta_atual: "x".repeat(1_200_000) });
    assert.equal(r.status, 413);
    assert.equal(r.json.error.code, "INVALID_REQUEST");
  });

  it("converte indisponibilidade do Gemini (503) sem vazar a mensagem do provedor", async () => {
    estado.responderGemini = () => ({
      status: 503,
      body: { error: { code: 503, message: "texto-interno-do-provedor", status: "UNAVAILABLE" } },
    });
    const r = await chamar("POST", "/chat", { pergunta_atual: "Oi" });
    assert.equal(r.status, 503);
    assert.equal(r.json.success, false);
    assert.equal(r.json.error.code, "AI_SERVICE_UNAVAILABLE");
    assert.equal(r.json.error.message, "Não foi possível obter uma resposta do Google Gemini.");
    assert.equal(r.json.response_ia, null);
    assert.ok(!JSON.stringify(r.json).includes("texto-interno-do-provedor"));
  });
});

describe("POST /moderacao/receita", () => {
  const corpo = (extra: object = {}) => ({
    motivo: "Violação de direitos autorais",
    detalhe: "Conteúdo de terceiros sem autoria.",
    receita: {
      titulo: "Frango ao Limão Siciliano",
      descricao: "Frango marinado com limão siciliano.",
      tempo: "00:40:00",
      id_custo: 1,
      id_dificuldade: 1,
      id_porcao: 4,
      ingredientes: [{ nome: "Filé de frango", quantidade: "600", id_unidade_medida: "g" }],
      modo_preparo: [{ metodo_preparo: "Sele os filés.", ordem_preparo: 1 }],
      categorias: ["Almoço"],
      tags: ["#ComidaRuim"],
      ...extra,
    },
  });

  it("devolve a decisão e anexa foto e vídeo (baixados da URL) ao Gemini", async () => {
    estado.midias[`${PUBLICO}/frango.jpg`] = { body: JPEG };
    estado.midias[`${PUBLICO}/frango.mp4`] = { body: MP4 };
    estado.responderGemini = () => respostaGemini('{"apagar": false}');

    const r = await chamar("POST", "/moderacao/receita", corpo({
      foto: `${PUBLICO}/frango.jpg`,
      video: `${PUBLICO}/frango.mp4`,
    }));

    assert.equal(r.status, 200);
    assert.equal(r.json.message, "Denúncia analisada com sucesso.");
    assert.deepEqual(r.json.response_ia, { apagar: false });

    const req = estado.googleRequests[0];
    const mimes = partes(req).filter((p: any) => p.inlineData).map((p: any) => p.inlineData.mimeType);
    assert.deepEqual(mimes, ["image/jpeg", "video/mp4"]);
    assert.match(JSON.stringify(req.systemInstruction), /RECEITA/);
    assert.ok(req.generationConfig.responseSchema, "usa saída estruturada");
    assert.ok(!JSON.stringify(req).includes(PUBLICO), "as URLs não vão no texto");
  });

  it("apagar = true quando o Gemini decide apagar", async () => {
    estado.responderGemini = () => respostaGemini('{"apagar": true}');
    const r = await chamar("POST", "/moderacao/receita", corpo());
    assert.deepEqual(r.json.response_ia, { apagar: true });
  });

  it("URL de imagem interna/privada é recusada (INVALID_IMAGE_URL) sem chamar o Gemini", async () => {
    const r = await chamar("POST", "/moderacao/receita", corpo({ foto: "http://169.254.169.254/latest/meta-data" }));
    assert.equal(r.status, 422);
    assert.equal(r.json.error.code, "INVALID_IMAGE_URL");
    assert.equal(estado.googleRequests.length, 0);
  });

  it("URL de vídeo que não é vídeo devolve INVALID_VIDEO_URL", async () => {
    estado.midias[`${PUBLICO}/nao.mp4`] = { body: PNG };
    const r = await chamar("POST", "/moderacao/receita", corpo({ video: `${PUBLICO}/nao.mp4` }));
    assert.equal(r.json.error.code, "INVALID_VIDEO_URL");
  });

  it("resposta do Gemini fora do formato vira AI_RESPONSE_INVALID", async () => {
    estado.responderGemini = () => respostaGemini("não sei decidir");
    const r = await chamar("POST", "/moderacao/receita", corpo());
    assert.equal(r.status, 502);
    assert.equal(r.json.error.code, "AI_RESPONSE_INVALID");
  });

  it("exige motivo e receita.titulo", async () => {
    const r = await chamar("POST", "/moderacao/receita", { detalhe: "x", receita: {} });
    assert.equal(r.status, 400);
    assert.equal(r.json.error.code, "INVALID_REQUEST");
  });
});

describe("POST /moderacao/comunidade", () => {
  it("analisa foto e banner e aceita detalhe vazio", async () => {
    estado.midias[`${PUBLICO}/foto.png`] = { body: PNG };
    estado.midias[`${PUBLICO}/banner.png`] = { body: PNG };
    estado.responderGemini = () => respostaGemini('{"apagar": true}');

    const r = await chamar("POST", "/moderacao/comunidade", {
      motivo: "Não tem relação com culinária",
      detalhe: "",
      comunidade: {
        nome: "Veganos Criativos",
        descricao: "Receitas plant-based e adaptações.",
        foto_url: `${PUBLICO}/foto.png`,
        banner_url: `${PUBLICO}/banner.png`,
        id_categoria_principal: "Vegana",
      },
    });

    assert.equal(r.status, 200);
    assert.deepEqual(r.json.response_ia, { apagar: true });
    const req = estado.googleRequests[0];
    assert.equal(partes(req).filter((p: any) => p.inlineData).length, 2);
    assert.match(JSON.stringify(req.systemInstruction), /COMUNIDADE/);
  });
});

describe("POST /moderacao/perfil", () => {
  const perfil = (extra: object = {}) => ({
    motivo: "Spam ou propaganda",
    detalhe: "Publica propaganda repetidamente.",
    dados_usuario: {
      nome: "Carlos Ferreira",
      username: "carlosf",
      email: "carlos-privado@email.com",
      data_nascimento: "1990-05-15",
      ...extra,
    },
  });

  it("recusa requisição com senha e não envia nada ao Gemini", async () => {
    const r = await chamar("POST", "/moderacao/perfil", perfil({ senha: "senha123-secreta" }));
    assert.equal(r.status, 400);
    assert.equal(r.json.error.code, "INVALID_REQUEST");
    assert.match(r.json.error.message, /senha/);
    assert.ok(!JSON.stringify(r.json).includes("senha123-secreta"), "não repete a senha na resposta");
    assert.equal(estado.googleRequests.length, 0);
  });

  it("não envia e-mail nem data de nascimento ao Gemini", async () => {
    estado.responderGemini = () => respostaGemini('{"apagar": false}');
    const r = await chamar("POST", "/moderacao/perfil", perfil());
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.response_ia, { apagar: false });

    const enviado = JSON.stringify(estado.googleRequests[0]);
    assert.match(enviado, /carlosf/);
    assert.ok(!enviado.includes("carlos-privado@email.com"));
    assert.ok(!enviado.includes("1990-05-15"));
    assert.match(JSON.stringify(estado.googleRequests[0].systemInstruction), /PERFIL DE USU/);
  });
});

describe("POST /pesquisa", () => {
  const receitaIA = {
    titulo: "Macarrão com frango",
    descricao: "Macarrão cremoso com frango desfiado.",
    tempo: "00:30:00",
    custo: "Baixo",
    dificuldade: "Fácil",
    porcao: 4,
    ingredientes: [{ nome: "Macarrão", quantidade: "500", id_unidade_medida: "g" }],
    modo_preparo: [
      { metodo_preparo: "Misture tudo.", ordem_preparo: 5 },
      { metodo_preparo: "Cozinhe o macarrão.", ordem_preparo: 2 },
    ],
    categorias: ["Almoço"],
    tags: ["#Rápido"],
  };
  const entrada = {
    pesquisa_usuario: "frango",
    encontrados_db: [
      { titulo: "Filé de frango", descricao: "x", foto: "http://x/a.jpg", video: "", tempo: "00:20:00", custo: "Baixo", dificuldade: "Fácil", porcao: 2 },
    ],
  };
  // IP público: a validação de endereço não depende de DNS nos testes
  const FOTO = "http://93.184.216.34/macarrao.jpg";
  const sugestao = () => respostaGemini(JSON.stringify({ tem_sugestao: true, receita: receitaIA }));
  const provedorQueFalha = { buscarImagem: async () => { throw new Error("provedor fora do ar"); } };
  const provedorComFoto = (url: string) => ({ buscarImagem: async () => url });

  it("gera receita completa com a foto do provedor, reordena os passos e deixa video nulo", async () => {
    registrarProvedorDeImagem(provedorComFoto(FOTO));
    estado.midias[FOTO] = { body: JPEG };
    estado.responderGemini = sugestao;
    const r = await chamar("POST", "/pesquisa", entrada);

    assert.equal(r.status, 200);
    assert.equal(r.json.message, "Pesquisa analisada com sucesso.");
    assert.equal(r.json.response_ia.possui_sugestao, true);
    const receita = r.json.response_ia.receita;
    assert.equal(receita.titulo, "Macarrão com frango");
    assert.deepEqual(receita.modo_preparo.map((p: any) => [p.ordem_preparo, p.metodo_preparo]), [
      [1, "Cozinhe o macarrão."],
      [2, "Misture tudo."],
    ]);
    assert.equal(receita.foto, FOTO);
    assert.equal(receita.video, null);
    assert.ok(!JSON.stringify(estado.googleRequests[0]).includes("http://x/a.jpg"), "URLs do banco não vão ao Gemini");
  });

  it("sem nenhum provedor de imagem, não sugere a receita (foto obrigatória)", async () => {
    registrarProvedorDeImagem(null);
    estado.responderGemini = sugestao;
    const r = await chamar("POST", "/pesquisa", entrada);

    assert.equal(r.status, 502);
    assert.equal(r.json.success, false);
    assert.equal(r.json.error.code, "TOOL_ERROR");
    assert.equal(r.json.response_ia, null);
  });

  it("usa o próximo provedor quando o primeiro falha", async () => {
    registrarProvedorDeImagem([provedorQueFalha, provedorComFoto(FOTO)]);
    estado.midias[FOTO] = { body: JPEG };
    estado.responderGemini = sugestao;
    const r = await chamar("POST", "/pesquisa", entrada);

    assert.equal(r.status, 200);
    assert.equal(r.json.response_ia.receita.foto, FOTO);
  });

  it("rejeita a URL que não é imagem e continua a busca nos próximos provedores", async () => {
    const paginaHtml = "http://93.184.216.34/pagina.jpg";
    estado.midias[paginaHtml] = { body: Buffer.from("<html>erro 404</html>") };
    registrarProvedorDeImagem([provedorComFoto(paginaHtml), provedorComFoto(FOTO)]);
    estado.midias[FOTO] = { body: JPEG };
    estado.responderGemini = sugestao;
    const r = await chamar("POST", "/pesquisa", entrada);

    assert.equal(r.status, 200);
    assert.equal(r.json.response_ia.receita.foto, FOTO);
  });

  it("quando todos os provedores falham, devolve erro controlado e nenhuma sugestão", async () => {
    registrarProvedorDeImagem([provedorQueFalha, { buscarImagem: async () => null }]);
    estado.responderGemini = sugestao;
    const r = await chamar("POST", "/pesquisa", entrada);

    assert.equal(r.status, 502);
    assert.equal(r.json.error.code, "TOOL_ERROR");
    assert.equal(r.json.response_ia, null);
  });

  it("respeita o timeout de um provedor que não responde e segue para a fonte seguinte", async () => {
    const timeoutAnterior = env.mediaTimeoutMs;
    env.mediaTimeoutMs = 50;
    try {
      estado.wikimedia = (url) =>
        url.includes("pt.wikipedia.org")
          ? "pendurar"
          : { status: 200, body: { query: { pages: { "9": { title: "Macarrão", index: 1, imageinfo: [{ mime: "image/jpeg", thumburl: FOTO }] } } } } };
      estado.midias[FOTO] = { body: JPEG };
      estado.responderGemini = sugestao;
      const r = await chamar("POST", "/pesquisa", entrada);

      assert.equal(r.status, 200);
      assert.equal(r.json.response_ia.receita.foto, FOTO);
    } finally {
      env.mediaTimeoutMs = timeoutAnterior;
    }
  });

  it("na Wikipédia, escolhe o resultado que combina com a receita", async () => {
    estado.wikimedia = () => ({
      status: 200,
      body: {
        query: {
          pages: {
            "1": { title: "Trem", index: 1, thumbnail: { source: "http://93.184.216.34/trem.jpg" } },
            "2": { title: "Macarrão", index: 2, thumbnail: { source: FOTO } },
          },
        },
      },
    });
    estado.midias[FOTO] = { body: JPEG };
    estado.responderGemini = sugestao;
    const r = await chamar("POST", "/pesquisa", entrada);

    assert.equal(r.json.response_ia.receita.foto, FOTO);
  });

  it("usa o modelo alternativo do Gemini quando o principal está indisponível", async () => {
    estado.responderGemini = (_corpo, url) =>
      url.includes("gemini-3.5-flash-lite")
        ? { status: 503, body: { error: { code: 503, message: "high demand", status: "UNAVAILABLE" } } }
        : respostaGemini(JSON.stringify({ tem_sugestao: false }));
    const r = await chamar("POST", "/pesquisa", entrada);

    assert.equal(r.status, 200);
    assert.equal(r.json.response_ia.possui_sugestao, false);
    assert.equal(estado.googleUrls.length, 2);
    assert.ok(estado.googleUrls[1].includes("gemini-3.1-flash-lite"));
  });

  it("não troca de modelo quando o erro é de requisição inválida", async () => {
    estado.responderGemini = () => ({ status: 400, body: { error: { code: 400, message: "Invalid argument", status: "INVALID_ARGUMENT" } } });
    const r = await chamar("POST", "/pesquisa", entrada);

    assert.ok(r.status >= 500);
    assert.equal(estado.googleUrls.length, 1);
  });

  it("indica que não há sugestão nova", async () => {
    estado.responderGemini = () => respostaGemini(JSON.stringify({ tem_sugestao: false }));
    const r = await chamar("POST", "/pesquisa", entrada);
    assert.deepEqual(r.json.response_ia, { possui_sugestao: false, receita: null });
  });

  it("não sugere uma receita que o banco já devolveu", async () => {
    estado.responderGemini = () =>
      respostaGemini(JSON.stringify({ tem_sugestao: true, receita: { ...receitaIA, titulo: "FILE DE FRANGO" } }));
    const r = await chamar("POST", "/pesquisa", entrada);
    assert.equal(r.json.response_ia.possui_sugestao, false);
  });

  it("aceita lista vazia do banco e exige a pesquisa", async () => {
    estado.responderGemini = () => respostaGemini(JSON.stringify({ tem_sugestao: false }));
    assert.equal((await chamar("POST", "/pesquisa", { pesquisa_usuario: "bolo", encontrados_db: [] })).status, 200);
    const r = await chamar("POST", "/pesquisa", { encontrados_db: [] });
    assert.equal(r.json.error.message, "O campo 'pesquisa_usuario' é obrigatório.");
  });
});
