# Chefinho API — documentação

O **Chefinho** é a API de IA do Entre Panelas. O backend do Entre Panelas fala com o Chefinho por HTTP, e só o Chefinho fala com o Google Gemini (via LangChain).

```text
Frontend → Backend Entre Panelas → (HTTP) Chefinho API → LangChain → Gemini
```

O Chefinho **não** acessa o banco do Entre Panelas e **não** executa nenhuma ação (como apagar conteúdo). Ele recebe os dados, analisa e devolve uma resposta; quem age é o backend.

## Rotas

| Método | Rota | Função | Documentação |
|---|---|---|---|
| GET | `/v1/chefinho/status` | Verifica se a API está no ar | [status.md](status.md) |
| POST | `/v1/chefinho/chat` | Conversa com o usuário | [chat.md](chat.md) |
| POST | `/v1/chefinho/moderacao/receita` | Analisa denúncia de receita | [moderacao-receita.md](moderacao-receita.md) |
| POST | `/v1/chefinho/moderacao/comunidade` | Analisa denúncia de comunidade | [moderacao-comunidade.md](moderacao-comunidade.md) |
| POST | `/v1/chefinho/moderacao/perfil` | Analisa denúncia de perfil | [moderacao-perfil.md](moderacao-perfil.md) |
| POST | `/v1/chefinho/pesquisa` | Sugere receita nova a partir de uma pesquisa | [pesquisa.md](pesquisa.md) |

Todas as rotas POST usam `Content-Type: application/json`.

## Autenticação (opcional)

Se a variável `CHEFINHO_API_KEY` estiver definida no `.env` do Chefinho, todas as rotas (**exceto** `/status`) exigem o header:

```text
x-api-key: <valor de CHEFINHO_API_KEY>
```

Sem a variável, a API fica aberta (use só em desenvolvimento). Sem o header correto a resposta é `401` com o código `UNAUTHORIZED`.

## Formato padrão das respostas

**Todas** as rotas, de sucesso ou erro, retornam este envelope. Só `response_ia` muda conforme a função.

```json
{
  "status_code": 200,
  "success": true,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Operação realizada com sucesso.",
  "response_ia": {},
  "error": null
}
```

Em erro, `response_ia` é `null` e `error` é preenchido:

```json
{
  "status_code": 400,
  "success": false,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Dados inválidos.",
  "response_ia": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "O campo 'pergunta_atual' é obrigatório.",
    "details": [{ "campo": "pergunta_atual", "mensagem": "campo obrigatório" }]
  }
}
```

O backend deve identificar o erro por `error.code`, **nunca** pelo texto. O `details` pode ser `null` ou uma lista/objeto com mais informações (ex.: quais campos são inválidos).

## Códigos de erro

| Código | HTTP | Quando acontece |
|---|---|---|
| `INVALID_REQUEST` | 400 (413 se o corpo passar de 1 MB) | JSON inválido, campo ausente ou com formato errado |
| `UNAUTHORIZED` | 401 | `x-api-key` ausente ou incorreta (quando a autenticação está ligada) |
| `NOT_FOUND` | 404 | Rota inexistente |
| `INVALID_IMAGE_URL` | 422 | A imagem da URL não pôde ser usada (URL inacessível, não é JPEG/PNG/WEBP, maior que 5 MB, endereço interno bloqueado) |
| `INVALID_VIDEO_URL` | 422 | O vídeo da URL não pôde ser usado (inacessível, não é MP4/MOV/WEBM, maior que 14 MB) |
| `AI_RESPONSE_INVALID` | 502 | O Gemini respondeu fora do formato esperado |
| `TOOL_ERROR` | 502 | Falha em uma ferramenta externa (provedor de imagem/vídeo) |
| `AI_SERVICE_UNAVAILABLE` | 503 | Gemini indisponível, sobrecarregado ou sem chave configurada |
| `AI_TIMEOUT` | 504 | O Gemini demorou demais para responder |
| `INTERNAL_ERROR` | 500 | Erro inesperado do Chefinho |

A mensagem bruta do Gemini nunca é devolvida; ela só aparece no log do servidor.

## Mídia (imagens e vídeos)

O backend envia apenas **URLs**. O Chefinho baixa o arquivo, valida e entrega ao Gemini.

| | Imagem | Vídeo |
|---|---|---|
| Formatos | JPEG, PNG, WEBP | MP4, MOV, WEBM |
| Tamanho máximo | 5 MB | 14 MB |
| URL | `http`/`https` pública, apontando direto para o arquivo | idem (links de YouTube e similares **não** funcionam) |

O formato é identificado pelo conteúdo do arquivo, não pela extensão. URLs que apontam para `localhost` ou redes internas são bloqueadas. Se uma mídia informada não puder ser usada, a rota responde com `INVALID_IMAGE_URL` ou `INVALID_VIDEO_URL` (o motivo vem em `error.details.motivo`) e **nenhuma** análise é feita; o backend decide o que fazer.

## Variáveis de ambiente (`.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GOOGLE_API_KEY` | Sim | Chave da API do Google Gemini |
| `PORT` | Não | Porta do servidor (padrão `3001`) |
| `CHEFINHO_API_KEY` | Não | Se definida, liga a autenticação por `x-api-key` |
| `GEMINI_MODEL` | Não | Troca o modelo (padrão `gemini-3.5-flash-lite`) |
| `AI_TIMEOUT_MS` | Não | Tempo máximo de espera pelo Gemini (padrão `60000`) |
| `MEDIA_TIMEOUT_MS` | Não | Tempo máximo para baixar uma mídia (padrão `10000`) |

## Como rodar

Requisito: Node.js 22 ou superior.

```bash
npm install
npm run dev        # desenvolvimento
npm run build      # compila para dist/
npm start          # roda a versão compilada
npm test           # testes automatizados
```

Teste rápido (a rota de status não usa o Gemini):

```bash
curl http://localhost:3001/v1/chefinho/status
```

No PowerShell: `Invoke-RestMethod http://localhost:3001/v1/chefinho/status`

Para as rotas POST, o mais simples é usar Postman ou Insomnia com `Body → raw → JSON` e os exemplos de cada documento.

## Provedores de imagem e vídeo

Usados pela rota de pesquisa para completar uma receita sugerida. **A foto é obrigatória**: se nenhum provedor entregar uma foto válida, a rota responde `TOOL_ERROR` e nenhuma sugestão é devolvida. **O vídeo é opcional**: sem vídeo, a receita sai com `"video": null`.

**Imagens (ordem de tentativa)**, todas sem chave de API:

1. Wikipédia em português (`pt.wikipedia.org`), foto do artigo que combina com a receita.
2. Wikimedia Commons (`commons.wikimedia.org`), usada se a Wikipédia não tiver foto.

Cada URL encontrada é baixada e validada antes de ser usada: precisa ser JPEG, PNG ou WEBP, ter até 5 MB e apontar para um endereço público. Um resultado que não combina com o nome da receita também é descartado. As requisições usam um `User-Agent` identificado, exigido pela política de uso da Wikimedia.

**Limitação:** as imagens da Wikimedia têm licenças livres, mas algumas exigem atribuição do autor, que o contrato da receita não carrega. Antes de publicar as fotos, confira a licença de cada uma.

**Vídeo:** ainda não há provedor de vídeo. `buscarVideo()` devolve `null`, então hoje todas as receitas saem com `"video": null`. Para habilitar, registre um provedor com `registrarProvedorDeVideo(...)`.

Para trocar ou acrescentar fontes de imagem, implemente `ProvedorDeImagem` (em `src/tools/image.tool.ts`) e informe a lista em `registrarProvedorDeImagem([...])`.

## Versão

A versão do agente (`agent.version`) vem do `version` do `package.json`.
