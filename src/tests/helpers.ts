import "./setup";

export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 1),
]);
export const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
export const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from("ftypmp42"),
  Buffer.alloc(64, 1),
]);

// Resposta no formato da API generateContent do Gemini
export function respostaGemini(texto: string) {
  return {
    status: 200,
    body: {
      candidates: [{ content: { role: "model", parts: [{ text: texto }] }, finishReason: "STOP", index: 0 }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
    },
  };
}

export interface EstadoMock {
  googleRequests: any[];
  midias: Record<string, { status?: number; body: Buffer }>;
  responderGemini: (corpo: any) => { status: number; body: any };
}

// Troca o fetch global: o Google e as URLs de mídia são simulados; o resto passa direto
export function instalarMocks() {
  const fetchReal = globalThis.fetch;
  const estado: EstadoMock = {
    googleRequests: [],
    midias: {},
    responderGemini: () => respostaGemini("Resposta padrão"),
  };

  globalThis.fetch = (async (entrada: any, init?: any) => {
    const url = typeof entrada === "string" ? entrada : (entrada.url ?? String(entrada));

    if (url.includes("generativelanguage.googleapis.com")) {
      const corpo = JSON.parse(init?.body ?? "{}");
      estado.googleRequests.push(corpo);
      const { status, body } = estado.responderGemini(corpo);
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }

    const midia = estado.midias[url];
    if (midia) {
      return new Response(new Uint8Array(midia.body), {
        status: midia.status ?? 200,
        headers: { "content-length": String(midia.body.length) },
      });
    }

    return fetchReal(entrada, init);
  }) as typeof fetch;

  return { estado, restaurar: () => (globalThis.fetch = fetchReal) };
}
